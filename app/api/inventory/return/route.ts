import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { TransactionType } from '@prisma/client'
import { broadcastInventoryUpdate } from '@/lib/pusher'
import { createLowStockAlerts } from '@/lib/utils/check-stock-alerts'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, warehouseId, quantity, reason, batchNumber, expiryDate } = body

    // Validate required fields
    if (!productId || !warehouseId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: product, warehouse, and quantity are required' },
        { status: 400 }
      )
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number greater than 0' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: 'Quantity must be a whole number' },
        { status: 400 }
      )
    }

    // Get the current user ID from database (handles stale session after DB reset)
    // This works for both email/password and OAuth authentication methods
    let currentUserId: string | null = null
    if (session.user?.email) {
      // Primary method: Look up by email (most reliable, works after DB reset)
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      })
      currentUserId = dbUser?.id || null
    } else if (session.user?.id) {
      // Fallback: Try to verify session.user.id exists in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      })
      currentUserId = dbUser?.id || null
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find or create inventory record
      let inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      })

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId,
            warehouseId,
            quantity: 0,
          },
        })
      }

      // Add returned quantity to inventory
      inventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      })

      // Create batch if provided
      if (batchNumber) {
        await tx.productBatch.upsert({
          where: {
            productId_batchNumber_warehouseId: {
              productId,
              batchNumber,
              warehouseId,
            },
          },
          create: {
            productId,
            batchNumber,
            warehouseId,
            quantity,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
          },
          update: {
            quantity: {
              increment: quantity,
            },
            expiryDate: expiryDate ? new Date(expiryDate) : null,
          },
        })
      }

      // Create transaction record for return
      const transaction = await tx.transaction.create({
        data: {
          productId,
          destinationWarehouseId: warehouseId,
          quantity,
          type: TransactionType.RETURN,
          userId: currentUserId,
          reason: reason || 'Items returned to warehouse',
          department: null,
        },
      })

      return { inventory, transaction }
    })

    // Broadcast inventory update via WebSocket
    await broadcastInventoryUpdate({
      type: 'return',
      inventoryId: result.inventory.id,
      productId: result.inventory.productId,
      warehouseId: result.inventory.warehouseId,
      quantity: result.inventory.quantity,
      message: `Stock returned: ${quantity} units`,
    })

    // Check for low stock alerts (might resolve after return)
    await createLowStockAlerts()

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Return inventory error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process return. Please try again.' },
      { status: 500 }
    )
  }
}

