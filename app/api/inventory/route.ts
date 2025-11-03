import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { TransactionType, PurchaseOrderStatus, AlertStatus } from '@prisma/client'
import { broadcastInventoryUpdate } from '@/lib/pusher'
import { createLowStockAlerts } from '@/lib/utils/check-stock-alerts'

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

    // Calculate global totals for each product
    const globalTotals = await prisma.inventory.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
    })

    const totalsMap = new Map(globalTotals.map(t => [t.productId, t._sum.quantity || 0]))

    // Add global total to each inventory item
    const inventoryWithTotals = inventory.map(inv => ({
      ...inv,
      globalTotal: totalsMap.get(inv.productId) || 0,
    }))

    return NextResponse.json(inventoryWithTotals)
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
    const { productId, warehouseId, quantity, type, batchNumber, expiryDate, reason, department, supplierId, userId: selectedUserId } = body

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

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Determine userId: use selectedUserId for OUT, or currentUserId for IN (or fallback)
      let transactionUserId = currentUserId
      
      if (type === TransactionType.OUT && selectedUserId) {
        // For Stock Out, use the selected user
        const selectedUser = await tx.user.findUnique({
          where: { id: selectedUserId },
        })
        if (selectedUser) {
          transactionUserId = selectedUserId
        }
      }
      
      // Ensure we have a valid userId - create a system user if needed
      if (!transactionUserId) {
        // Try to find any admin user as fallback
        const adminUser = await tx.user.findFirst({
          where: { role: 'ADMIN' },
        })
        if (adminUser) {
          transactionUserId = adminUser.id
        } else {
          // If no admin found, use first user as last resort
          const firstUser = await tx.user.findFirst()
          if (firstUser) {
            transactionUserId = firstUser.id
          } else {
            throw new Error('No user found in database. Cannot create transaction without a user.')
          }
        }
      }
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

      // Build reason with supplier/user info
      let transactionReason = reason
      if (!transactionReason) {
        if (type === TransactionType.IN) {
          // For Stock In, include supplier name if provided
          if (supplierId) {
            const supplier = await tx.supplier.findUnique({
              where: { id: supplierId },
              select: { name: true },
            })
            transactionReason = supplier ? `Stock In from ${supplier.name}` : 'Stock In'
          } else {
            transactionReason = 'Stock In'
          }
        } else {
          transactionReason = 'Stock Out'
        }
      }

      // Create transaction record with user tracking
      const transaction = await tx.transaction.create({
        data: {
          productId,
          sourceWarehouseId: type === TransactionType.OUT ? warehouseId : undefined,
          destinationWarehouseId: type === TransactionType.IN ? warehouseId : undefined,
          quantity,
          type,
          userId: transactionUserId,
          reason: transactionReason,
          department: department || null,
        },
      })

      // Check for low stock alerts and auto-create purchase order (after transaction is committed)
      // We'll do this outside the transaction to avoid rollback issues

      return { inventory, transaction }
    })

    // Broadcast inventory update via WebSocket
    await broadcastInventoryUpdate({
      type: 'adjustment',
      inventoryId: result.inventory.id,
      productId: result.inventory.productId,
      warehouseId: result.inventory.warehouseId,
      quantity: result.inventory.quantity,
      message: `Stock ${type === TransactionType.IN ? 'added' : 'removed'}: ${result.inventory.quantity} units`,
    })

    // Check for low stock alerts and auto-create purchase order (outside transaction)
    // This prevents transaction rollback if PO creation fails
    try {
      const productSettings = await prisma.productSetting.findUnique({
        where: { productId: result.inventory.productId },
      })

      if (productSettings) {
        // Calculate total inventory across all warehouses
        const allInventories = await prisma.inventory.findMany({
          where: { productId: result.inventory.productId },
        })
        const totalQuantity = allInventories.reduce((sum, inv) => sum + inv.quantity, 0)

        if (totalQuantity < productSettings.minStockLevel) {
          // Check if alert already exists
          const existingAlert = await prisma.alert.findFirst({
            where: {
              productId: result.inventory.productId,
              status: 'NEW',
              message: {
                contains: 'Low stock',
              },
            },
          })

          if (!existingAlert) {
            await prisma.alert.create({
              data: {
                productId: result.inventory.productId,
                message: `Low stock alert: ${totalQuantity} units remaining (min: ${productSettings.minStockLevel})`,
                status: 'NEW',
              },
            })
          }

          // Auto-create purchase order if below minimum stock
          const existingPO = await prisma.purchaseOrder.findFirst({
            where: {
              productId: result.inventory.productId,
              status: PurchaseOrderStatus.PENDING,
            },
          })

          if (!existingPO) {
            // Get all suppliers linked to the product and choose the one with minimum cost
            const productSuppliers = await prisma.productSupplier.findMany({
              where: { productId: result.inventory.productId },
              orderBy: {
                price: 'asc', // Order by price ascending (cheapest first)
              },
            })

            if (productSuppliers && productSuppliers.length > 0) {
              // Choose supplier with minimum cost
              const productSupplier = productSuppliers[0]
              
              // Calculate reorder quantity using predictive formula
              const lookbackDays = 90
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - lookbackDays)
              
              const outTransactions = await prisma.transaction.findMany({
                where: {
                  productId: result.inventory.productId,
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

              const totalOutQuantity = outTransactions.reduce((sum, tx) => sum + tx.quantity, 0)
              const daysWithActivity = Math.max(
                Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
                1
              )
              
              const avgDailyUsage = totalOutQuantity / daysWithActivity
              const leadTimeDays = productSettings.leadTimeDays || 7
              const safetyStock = productSettings.safetyStock || 0

              let reorderQuantity = Math.ceil(
                (avgDailyUsage * leadTimeDays) + safetyStock - totalQuantity
              )

              if (reorderQuantity <= 0 || totalOutQuantity === 0) {
                reorderQuantity = productSettings.minStockLevel * 2
              }

              if (reorderQuantity < productSettings.minStockLevel) {
                reorderQuantity = productSettings.minStockLevel
              }

              try {
                await prisma.purchaseOrder.create({
                  data: {
                    supplierId: productSupplier.supplierId,
                    productId: result.inventory.productId,
                    quantity: reorderQuantity,
                    status: PurchaseOrderStatus.PENDING,
                  },
                })

                await prisma.alert.create({
                  data: {
                    productId: result.inventory.productId,
                    message: `Auto-generated purchase order: ${reorderQuantity} units (Status: PENDING)`,
                    status: 'NEW',
                  },
                })

                console.log(`Auto-generated PO for product ${result.inventory.productId}: ${reorderQuantity} units from supplier ${productSupplier.supplierId}`)
              } catch (poError: any) {
                console.error(`Failed to auto-generate PO for product ${result.inventory.productId}:`, poError)
              }
            }
          }
        }
      }
    } catch (alertError: any) {
      console.error('Error in post-transaction alert/PO creation:', alertError)
      // Don't fail the request if alert/PO creation fails
    }

    // Check for low stock alerts
    await createLowStockAlerts()

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

