import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(productId && { productId }),
        ...(warehouseId && {
          OR: [
            { sourceWarehouseId: warehouseId },
            { destinationWarehouseId: warehouseId },
          ],
        }),
        ...(type && { type }),
      },
      include: {
        product: true,
        sourceWarehouse: true,
        destinationWarehouse: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    // For IN transactions, find supplier from purchase orders or parse from reason
    const transactionsWithSupplier = await Promise.all(
      transactions.map(async (tx) => {
        if (tx.type === 'IN' || tx.type === 'RETURN') {
          // Try to find supplier from purchase orders (most recent received PO for this product)
          const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: {
              productId: tx.productId,
              status: 'RECEIVED',
              createdAt: { lte: tx.timestamp },
            },
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
          })

          // If found, add supplier info
          if (purchaseOrder?.supplier) {
            return {
              ...tx,
              supplier: purchaseOrder.supplier,
            }
          }

          // Fallback: try to parse supplier name from reason field
          if (tx.reason && tx.reason.includes('Stock In from ')) {
            const supplierName = tx.reason.replace('Stock In from ', '').trim()
            // Try to find supplier by name
            const supplier = await prisma.supplier.findFirst({
              where: {
                name: supplierName,
              },
              select: {
                id: true,
                name: true,
              },
            })
            if (supplier) {
              return {
                ...tx,
                supplier,
              }
            }
          }
        }
        return tx
      })
    )

    const total = await prisma.transaction.count({
      where: {
        ...(productId && { productId }),
        ...(warehouseId && {
          OR: [
            { sourceWarehouseId: warehouseId },
            { destinationWarehouseId: warehouseId },
          ],
        }),
        ...(type && { type }),
      },
    })

    return NextResponse.json({
      transactions: transactionsWithSupplier,
      total,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

