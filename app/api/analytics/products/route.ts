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

    // Get products with their inventory and settings
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
        productSettings: true,
        alerts: {
          where: { status: 'NEW' },
        },
        batches: true,
      },
    })

    // Calculate statistics
    const totalProducts = products.length
    const productsWithInventory = products.filter(p => p.inventory.length > 0).length
    const productsByCategory = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalStockValue = products.reduce((sum, product) => {
      const totalQty = product.inventory.reduce((qty, inv) => qty + inv.quantity, 0)
      // Estimate value (you can enhance this with actual prices)
      return sum + totalQty
    }, 0)

    const lowStockProducts = products.filter(product => {
      const totalQty = product.inventory.reduce((qty, inv) => qty + inv.quantity, 0)
      const minLevel = product.productSettings?.minStockLevel || 0
      return totalQty < minLevel && minLevel > 0
    }).length

    const topProducts = products
      .map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        totalQuantity: product.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
        warehouses: product.inventory.length,
        alerts: product.alerts.length,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    return NextResponse.json({
      totalProducts,
      productsWithInventory,
      totalStockValue,
      lowStockProducts,
      productsByCategory: Object.entries(productsByCategory).map(([category, count]) => ({
        category,
        count,
      })),
      topProducts,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products analytics' },
      { status: 500 }
    )
  }
}

