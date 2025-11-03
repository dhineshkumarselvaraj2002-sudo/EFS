import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get inventory grouped by warehouse
    const inventory = await prisma.inventory.findMany({
      include: {
        warehouse: true,
        product: {
          include: {
            productSettings: true,
          },
        },
      },
    })

    // Group by warehouse and sum quantities
    const warehouseData = inventory.reduce((acc, inv) => {
      const warehouseName = inv.warehouse.name
      if (!acc[warehouseName]) {
        acc[warehouseName] = {
          totalQuantity: 0,
          lowStockItems: 0,
          totalProducts: 0,
        }
      }
      acc[warehouseName].totalQuantity += inv.quantity
      acc[warehouseName].totalProducts += 1
      
      const minLevel = inv.product.productSettings?.minStockLevel || 0
      if (inv.quantity < minLevel && minLevel > 0) {
        acc[warehouseName].lowStockItems += 1
      }
      
      return acc
    }, {} as Record<string, { totalQuantity: number; lowStockItems: number; totalProducts: number }>)

    // Convert to array format for charts
    const chartData = Object.entries(warehouseData).map(([warehouse, data]) => ({
      warehouse,
      quantity: data.totalQuantity,
      lowStock: data.lowStockItems,
      products: data.totalProducts,
    }))

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory analytics' },
      { status: 500 }
    )
  }
}

