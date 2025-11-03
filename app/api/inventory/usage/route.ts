import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { TransactionType, PurchaseOrderStatus, AlertStatus } from '@prisma/client'
import { broadcastInventoryUpdate } from '@/lib/pusher'
import { createLowStockAlerts } from '@/lib/utils/check-stock-alerts'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, warehouseId, quantity, reason, department } = body

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
      // Find inventory record
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      })

      if (!inventory) {
        throw new Error('No inventory found for this product in the specified warehouse')
      }

      // Validate sufficient quantity
      if (inventory.quantity < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${inventory.quantity} units, Requested: ${quantity} units`
        )
      }

      // FEFO: Use batches with earliest expiry first for usage
      const batches = await tx.productBatch.findMany({
        where: {
          productId,
          warehouseId,
          quantity: { gt: 0 },
        },
        orderBy: [
          { expiryDate: 'asc' }, // FEFO - First Expire First Out
          { createdAt: 'asc' }, // If no expiry, use creation date
        ],
      })

      let remainingQuantity = quantity

      // Deduct from batches using FEFO
      for (const batch of batches) {
        if (remainingQuantity <= 0) break

        const deductFromBatch = Math.min(batch.quantity, remainingQuantity)
        
        await tx.productBatch.update({
          where: { id: batch.id },
          data: {
            quantity: { decrement: deductFromBatch },
          },
        })

        remainingQuantity -= deductFromBatch
      }

      // Update inventory quantity
      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      })

      // Check for low stock alerts and auto-create purchase order
      const productSettings = await tx.productSetting.findUnique({
        where: { productId },
      })

      if (productSettings) {
        // Calculate total inventory across all warehouses
        const allInventories = await tx.inventory.findMany({
          where: { productId },
        })
        const totalQuantity = allInventories.reduce((sum, inv) => sum + inv.quantity, 0)

        if (totalQuantity < productSettings.minStockLevel) {
          const existingAlert = await tx.alert.findFirst({
            where: {
              productId,
              status: 'NEW',
              message: {
                contains: 'Low stock',
              },
            },
          })

          if (!existingAlert) {
            await tx.alert.create({
              data: {
                productId,
                message: `Low stock alert: ${totalQuantity} units remaining (min: ${productSettings.minStockLevel})`,
                status: 'NEW',
              },
            })
          }

          // Auto-create purchase order if below minimum stock
          const existingPO = await tx.purchaseOrder.findFirst({
            where: {
              productId,
              status: PurchaseOrderStatus.PENDING,
            },
          })

          if (!existingPO) {
            const productSuppliers = await tx.productSupplier.findMany({
              where: { productId },
              orderBy: { price: 'asc' },
            })

            if (productSuppliers && productSuppliers.length > 0) {
              const productSupplier = productSuppliers[0]
              const reorderQuantity = productSettings.minStockLevel * 2

              try {
                await tx.purchaseOrder.create({
                  data: {
                    supplierId: productSupplier.supplierId,
                    productId,
                    quantity: reorderQuantity,
                    status: PurchaseOrderStatus.PENDING,
                  },
                })

                await tx.alert.create({
                  data: {
                    productId,
                    message: `Auto-generated purchase order: ${reorderQuantity} units (Status: PENDING)`,
                    status: AlertStatus.NEW,
                  },
                })
              } catch (poError: any) {
                console.error(`Failed to auto-generate PO for product ${productId}:`, poError)
              }
            }
          }
        }
      }

      // Create transaction record for usage
      // Both sourceWarehouseId and destinationWarehouseId are required
      const transaction = await tx.transaction.create({
        data: {
          productId,
          sourceWarehouseId: warehouseId, // Source warehouse where items are used from
          destinationWarehouseId: warehouseId, // Destination is same warehouse (usage doesn't move to another warehouse)
          quantity,
          type: TransactionType.USAGE,
          userId: currentUserId,
          reason: reason || 'Items used in field',
          department: department || null,
        },
      })

      return { inventory: updatedInventory, transaction }
    })

    // Broadcast inventory update via WebSocket
    await broadcastInventoryUpdate({
      type: 'usage',
      inventoryId: result.inventory.id,
      productId: result.inventory.productId,
      warehouseId: result.inventory.warehouseId,
      quantity: result.inventory.quantity,
      message: `Stock used: ${quantity} units`,
    })

    // Check for low stock alerts
    await createLowStockAlerts()

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    // Handle validation errors
    if (error.message && (
      error.message.includes('Insufficient stock') ||
      error.message.includes('No inventory found')
    )) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('Usage inventory error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process usage. Please try again.' },
      { status: 500 }
    )
  }
}

