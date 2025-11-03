import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { TransactionType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, sourceWarehouseId, destinationWarehouseId, quantity } = body

    if (!productId || !sourceWarehouseId || !destinationWarehouseId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      return NextResponse.json(
        { error: 'Source and destination warehouses cannot be the same' },
        { status: 400 }
      )
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

      if (!sourceInventory || sourceInventory.quantity < quantity) {
        throw new Error('Insufficient stock in source warehouse')
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

      // Check for low stock alerts on source
      const productSettings = await tx.productSetting.findUnique({
        where: { productId },
      })

      const updatedSourceInventory = await tx.inventory.findUnique({
        where: { id: sourceInventory.id },
      })

      if (productSettings && updatedSourceInventory && updatedSourceInventory.quantity < productSettings.minStockLevel) {
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
              message: `Low stock alert: ${updatedSourceInventory.quantity} units remaining (min: ${productSettings.minStockLevel})`,
              status: 'NEW',
            },
          })
        }
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          productId,
          sourceWarehouseId,
          destinationWarehouseId,
          quantity,
          type: TransactionType.TRANSFER,
        },
      })

      return { transaction }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to transfer inventory' },
      { status: 500 }
    )
  }
}

