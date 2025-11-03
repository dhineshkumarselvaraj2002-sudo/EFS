import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderStatus, TransactionType } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, warehouseId } = body

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        product: true,
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // If status is RECEIVED, update inventory
    if (status === PurchaseOrderStatus.RECEIVED && warehouseId) {
      const result = await prisma.$transaction(async (tx) => {
        // Update purchase order status
        await tx.purchaseOrder.update({
          where: { id: params.id },
          data: { status: PurchaseOrderStatus.RECEIVED },
        })

        // Find or create inventory
        let inventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: purchaseOrder.productId,
              warehouseId,
            },
          },
        })

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: purchaseOrder.productId,
              warehouseId,
              quantity: 0,
            },
          })
        }

        // Update inventory
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: {
              increment: purchaseOrder.quantity,
            },
          },
        })

        // Handle batch if provided
        const { batchNumber, expiryDate } = body
        if (batchNumber) {
          await tx.productBatch.upsert({
            where: {
              productId_batchNumber_warehouseId: {
                productId: purchaseOrder.productId,
                batchNumber,
                warehouseId,
              },
            },
            create: {
              productId: purchaseOrder.productId,
              batchNumber,
              warehouseId,
              quantity: purchaseOrder.quantity,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
            },
            update: {
              quantity: {
                increment: purchaseOrder.quantity,
              },
              expiryDate: expiryDate ? new Date(expiryDate) : null,
            },
          })
        }

        // Create transaction
        await tx.transaction.create({
          data: {
            productId: purchaseOrder.productId,
            destinationWarehouseId: warehouseId,
            quantity: purchaseOrder.quantity,
            type: TransactionType.IN,
          },
        })

        // Check for low stock alerts (should be resolved now)
        const productSettings = await tx.productSetting.findUnique({
          where: { productId: purchaseOrder.productId },
        })

        const updatedInventory = await tx.inventory.findUnique({
          where: { id: inventory.id },
        })

        if (productSettings && updatedInventory && updatedInventory.quantity >= productSettings.minStockLevel) {
          // Mark existing low stock alerts as resolved (optional - could keep them for history)
          await tx.alert.updateMany({
            where: {
              productId: purchaseOrder.productId,
              status: 'NEW',
              message: {
                contains: 'Low stock',
              },
            },
            data: {
              status: 'READ',
            },
          })
        }
      })

      const updated = await prisma.purchaseOrder.findUnique({
        where: { id: params.id },
        include: {
          product: true,
          supplier: true,
        },
      })

      return NextResponse.json(updated)
    }

    // Just update status
    const updated = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: status as PurchaseOrderStatus },
      include: {
        product: true,
        supplier: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

