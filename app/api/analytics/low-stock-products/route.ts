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

    // Get inventory with products that are below min stock level
    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          include: {
            productSettings: true,
          },
        },
        warehouse: true,
      },
    })

    // Filter low stock items and group by product
    const lowStockProducts = inventory
      .filter((inv) => {
        const minLevel = inv.product.productSettings?.minStockLevel || 0
        return inv.quantity < minLevel && minLevel > 0
      })
      .reduce((acc, inv) => {
        const productName = inv.product.name
        const minLevel = inv.product.productSettings?.minStockLevel || 0
        const shortage = minLevel - inv.quantity

        if (!acc[productName]) {
          acc[productName] = {
            productName,
            totalQuantity: 0,
            minLevel,
            shortage: 0,
            warehouses: [] as string[],
          }
        }

        acc[productName].totalQuantity += inv.quantity
        acc[productName].shortage += shortage
        if (!acc[productName].warehouses.includes(inv.warehouse.name)) {
          acc[productName].warehouses.push(inv.warehouse.name)
        }

        return acc
      }, {} as Record<string, { productName: string; totalQuantity: number; minLevel: number; shortage: number; warehouses: string[] }>)

    // Convert to array and sort by shortage (most critical first)
    const chartData = Object.values(lowStockProducts)
      .map((item) => ({
        product: item.productName,
        currentStock: item.totalQuantity,
        minLevel: item.minLevel,
        shortage: item.shortage,
        warehouses: item.warehouses.length,
      }))
      .sort((a, b) => b.shortage - a.shortage)
      .slice(0, 10) // Top 10 low stock products

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch low stock products' },
      { status: 500 }
    )
  }
}

