import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      totalProducts,
      totalWarehouses,
      lowStockItems,
      pendingOrders,
      expiringBatches,
      newAlerts,
      newExpiryAlerts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.warehouse.count(),
      prisma.inventory.findMany({
        include: {
          product: {
            include: {
              productSettings: true,
            },
          },
        },
      }).then((inventory) =>
        inventory.filter((inv) => {
          const minLevel = inv.product.productSettings?.minStockLevel || 0
          return inv.quantity < minLevel
        }).length
      ),
      prisma.purchaseOrder.count({
        where: { status: 'PENDING' },
      }),
      prisma.productBatch.count({
        where: {
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      prisma.alert.count({
        where: { status: 'NEW' },
      }),
      prisma.expiryAlert.count({
        where: { status: 'NEW' },
      }),
    ])

    return NextResponse.json({
      totalProducts,
      totalWarehouses,
      lowStockItems,
      pendingOrders,
      expiringBatches,
      newAlerts,
      newExpiryAlerts,
      totalAlerts: newAlerts + newExpiryAlerts, // Total alerts count for badge
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

