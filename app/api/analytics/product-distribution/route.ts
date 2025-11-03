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

    // Get inventory grouped by product category
    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
      },
    })

    // Group by category
    const categoryData = inventory.reduce((acc, inv) => {
      const category = inv.product.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += inv.quantity
      return acc
    }, {} as Record<string, number>)

    // Convert to array format
    const chartData = Object.entries(categoryData).map(([category, quantity]) => ({
      category,
      quantity,
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5) // Top 5 categories

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product distribution' },
      { status: 500 }
    )
  }
}

