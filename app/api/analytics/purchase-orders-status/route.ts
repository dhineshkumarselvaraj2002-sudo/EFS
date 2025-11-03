import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderStatus } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get purchase orders grouped by status
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        product: true,
        supplier: true,
      },
    })

    // Group by status
    const statusData = purchaseOrders.reduce((acc, po) => {
      const status = po.status
      if (!acc[status]) {
        acc[status] = {
          count: 0,
          totalQuantity: 0,
          totalValue: 0,
        }
      }
      acc[status].count += 1
      acc[status].totalQuantity += po.quantity
      return acc
    }, {} as Record<PurchaseOrderStatus, { count: number; totalQuantity: number; totalValue: number }>)

    // Convert to array format
    const chartData = Object.entries(statusData).map(([status, data]) => ({
      status,
      count: data.count,
      quantity: data.totalQuantity,
    }))

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchase order status' },
      { status: 500 }
    )
  }
}

