import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { TransactionType, PurchaseOrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')

    const inventory = await prisma.inventory.findMany({
      where: {
        ...(warehouseId && { warehouseId }),
        ...(productId && { productId }),
      },
      include: {
        product: {
          include: {
            productSettings: true,
          },
        },
        warehouse: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(inventory)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, warehouseId, quantity, type, batchNumber, expiryDate } = body

    if (!productId || !warehouseId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      )
    }

    if (!type || (type !== TransactionType.IN && type !== TransactionType.OUT)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be IN or OUT' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity
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

      // Update quantity based on type
      let newQuantity = inventory.quantity
      if (type === TransactionType.IN) {
        newQuantity += quantity
      } else if (type === TransactionType.OUT) {
        if (inventory.quantity < quantity) {
          throw new Error('Insufficient stock')
        }
        
        // FEFO: Use batches with earliest expiry first for stock-out
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

        newQuantity -= quantity
      }

      // Update inventory
      inventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity },
      })

      // Create batch if provided
      if (batchNumber && type === TransactionType.IN) {
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
          },
        })
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          productId,
          sourceWarehouseId: type === TransactionType.OUT ? warehouseId : undefined,
          destinationWarehouseId: type === TransactionType.IN ? warehouseId : undefined,
          quantity,
          type,
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
          // Check if alert already exists
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
          // Check if there's already a pending PO
          const existingPO = await tx.purchaseOrder.findFirst({
            where: {
              productId,
              status: PurchaseOrderStatus.PENDING,
            },
          })

          if (!existingPO) {
            // Get supplier for the product
            const productSupplier = await tx.productSupplier.findFirst({
              where: { productId },
            })

            if (productSupplier) {
              // Calculate reorder quantity using predictive formula:
              // purchase_order_qty = (avg_daily_usage * lead_time_days) + safety_stock - current_stock
              
              // Calculate average daily usage from historical OUT transactions
              const lookbackDays = 90 // Use last 90 days for calculation
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - lookbackDays)
              
              const outTransactions = await tx.transaction.findMany({
                where: {
                  productId,
                  type: TransactionType.OUT,
                  timestamp: {
                    gte: startDate,
                  },
                },
                select: {
                  quantity: true,
                  timestamp: true,
                },
              })

              // Calculate total OUT quantity and days with activity
              const totalOutQuantity = outTransactions.reduce((sum, tx) => sum + tx.quantity, 0)
              const daysWithActivity = Math.max(
                Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
                1 // At least 1 day to avoid division by zero
              )
              
              // Average daily usage = total quantity / number of days
              const avgDailyUsage = totalOutQuantity / daysWithActivity

              // Get lead time and safety stock from product settings (with defaults)
              const leadTimeDays = productSettings.leadTimeDays || 7
              const safetyStock = productSettings.safetyStock || 0

              // Calculate reorder quantity using predictive formula
              let reorderQuantity = Math.ceil(
                (avgDailyUsage * leadTimeDays) + safetyStock - totalQuantity
              )

              // Fallback: If no historical data or calculation results in negative/zero,
              // use simple multiplier as before
              if (reorderQuantity <= 0 || totalOutQuantity === 0) {
                reorderQuantity = productSettings.minStockLevel * 2
              }

              // Ensure minimum reorder quantity is at least minStockLevel
              if (reorderQuantity < productSettings.minStockLevel) {
                reorderQuantity = productSettings.minStockLevel
              }

              // Create purchase order
              await tx.purchaseOrder.create({
                data: {
                  supplierId: productSupplier.supplierId,
                  productId,
                  quantity: reorderQuantity,
                  status: PurchaseOrderStatus.PENDING,
                },
              })
            }
          }
        }
      }

      return { inventory, transaction }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

