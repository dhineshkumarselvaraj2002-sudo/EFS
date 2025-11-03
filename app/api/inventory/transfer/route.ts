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
    const { productId, sourceWarehouseId, destinationWarehouseId, quantity, reason, department } = body

    // Validate required fields
    if (!productId || !sourceWarehouseId || !destinationWarehouseId) {
      return NextResponse.json(
        { error: 'Missing required fields: product, source warehouse, and destination warehouse are required' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'Quantity is required' },
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

    // Validate source and destination are different
    if (sourceWarehouseId === destinationWarehouseId) {
      return NextResponse.json(
        { error: 'Source and destination warehouses cannot be the same' },
        { status: 400 }
      )
    }

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Validate warehouses exist
    const sourceWarehouse = await prisma.warehouse.findUnique({
      where: { id: sourceWarehouseId },
    })

    if (!sourceWarehouse) {
      return NextResponse.json(
        { error: 'Source warehouse not found' },
        { status: 404 }
      )
    }

    const destinationWarehouse = await prisma.warehouse.findUnique({
      where: { id: destinationWarehouseId },
    })

    if (!destinationWarehouse) {
      return NextResponse.json(
        { error: 'Destination warehouse not found' },
        { status: 404 }
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
      // Check source inventory
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: sourceWarehouseId,
          },
        },
      })

      // Validate source has inventory
      if (!sourceInventory) {
        throw new Error(`No inventory found for ${product.name} in ${sourceWarehouse.name}. Cannot transfer stock that doesn't exist.`)
      }

      // Validate sufficient quantity
      if (sourceInventory.quantity < quantity) {
        throw new Error(
          `Insufficient stock in source warehouse. Available: ${sourceInventory.quantity} units, Requested: ${quantity} units`
        )
      }

      // FEFO: Get batches sorted by expiry date (earliest first)
      const batches = await tx.productBatch.findMany({
        where: {
          productId,
          warehouseId: sourceWarehouseId,
          quantity: { gt: 0 },
        },
        orderBy: [
          { expiryDate: 'asc' }, // FEFO - First Expire First Out
          { createdAt: 'asc' }, // If no expiry, use creation date
        ],
      })

      let remainingQuantity = quantity
      const batchUpdates: { id: string; quantity: number }[] = []

      // Allocate from batches using FEFO
      for (const batch of batches) {
        if (remainingQuantity <= 0) break

        const allocateFromBatch = Math.min(batch.quantity, remainingQuantity)
        
        // Update batch
        await tx.productBatch.update({
          where: { id: batch.id },
          data: {
            quantity: { decrement: allocateFromBatch },
          },
        })

        // Create or update destination batch
        await tx.productBatch.upsert({
          where: {
            productId_batchNumber_warehouseId: {
              productId,
              batchNumber: batch.batchNumber,
              warehouseId: destinationWarehouseId,
            },
          },
          create: {
            productId,
            batchNumber: batch.batchNumber,
            warehouseId: destinationWarehouseId,
            quantity: allocateFromBatch,
            expiryDate: batch.expiryDate,
          },
          update: {
            quantity: { increment: allocateFromBatch },
          },
        })

        remainingQuantity -= allocateFromBatch
      }

      // If there's remaining quantity (no batches or batches don't cover all), handle regular inventory
      if (remainingQuantity > 0) {
        // Update source warehouse
        await tx.inventory.update({
          where: { id: sourceInventory.id },
          data: {
            quantity: {
              decrement: remainingQuantity,
            },
          },
        })
      } else {
        // Still need to update source inventory if we used batches
        await tx.inventory.update({
          where: { id: sourceInventory.id },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        })
      }

      // Find or create destination inventory
      let destInventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: destinationWarehouseId,
          },
        },
      })

      if (!destInventory) {
        destInventory = await tx.inventory.create({
          data: {
            productId,
            warehouseId: destinationWarehouseId,
            quantity: 0,
          },
        })
      }

      // Update destination warehouse
      await tx.inventory.update({
        where: { id: destInventory.id },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      })

      // Check for low stock alerts on source and auto-create purchase order
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

      // Create transaction record with user tracking
      const transaction = await tx.transaction.create({
        data: {
          productId,
          sourceWarehouseId,
          destinationWarehouseId,
          quantity,
          type: TransactionType.TRANSFER,
          userId: currentUserId,
          reason: body.reason || 'Stock transfer between warehouses',
          department: body.department || null,
        },
      })

      // Get updated inventories for broadcasting (use already fetched updatedSourceInventory)
      const finalDestInventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: destinationWarehouseId,
          },
        },
      })

      return { transaction, sourceInventory: updatedSourceInventory, destInventory: finalDestInventory }
    })

    // Broadcast inventory updates via WebSocket
    if (result.sourceInventory) {
      await broadcastInventoryUpdate({
        type: 'transfer',
        inventoryId: result.sourceInventory.id,
        productId,
        warehouseId: sourceWarehouseId,
        quantity: result.sourceInventory.quantity,
        message: `Stock transferred out: ${quantity} units`,
      })
    }

    if (result.destInventory) {
      await broadcastInventoryUpdate({
        type: 'transfer',
        inventoryId: result.destInventory.id,
        productId,
        warehouseId: destinationWarehouseId,
        quantity: result.destInventory.quantity,
        message: `Stock transferred in: ${quantity} units`,
      })
    }

    // Check for low stock alerts
    await createLowStockAlerts()

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    // Handle validation errors (from throw statements) with 400 status
    if (error.message && (
      error.message.includes('Insufficient stock') ||
      error.message.includes('No inventory found')
    )) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Handle other errors with 500 status
    console.error('Transfer inventory error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transfer inventory. Please try again.' },
      { status: 500 }
    )
  }
}

