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

    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventory: {
          include: {
            product: true,
          },
        },
        batches: true,
        sourceTransactions: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        destinationTransactions: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    })

    const warehouseStats = warehouses.map(warehouse => {
      const totalQuantity = warehouse.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
      const totalProducts = warehouse.inventory.length
      const totalBatches = warehouse.batches.length
      const totalTransactions = warehouse.sourceTransactions.length + warehouse.destinationTransactions.length
      const lowStockItems = warehouse.inventory.filter(inv => {
        const minLevel = inv.product.productSettings?.minStockLevel || 0
        return inv.quantity < minLevel && minLevel > 0
      }).length

      return {
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.location,
        totalQuantity,
        totalProducts,
        totalBatches,
        totalTransactions,
        lowStockItems,
        utilizationRate: totalProducts > 0 ? (totalQuantity / (totalProducts * 100)) : 0,
      }
    })

    const totalWarehouses = warehouses.length
    const totalCapacity = warehouseStats.reduce((sum, w) => sum + w.totalQuantity, 0)
    const avgUtilization = warehouseStats.reduce((sum, w) => sum + w.utilizationRate, 0) / totalWarehouses

    const topWarehouses = [...warehouseStats]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    return NextResponse.json({
      totalWarehouses,
      totalCapacity,
      avgUtilization,
      warehouseStats,
      topWarehouses,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouses analytics' },
      { status: 500 }
    )
  }
}

