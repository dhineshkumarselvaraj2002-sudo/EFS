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

    // Get purchase orders grouped by supplier
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        product: true,
      },
    })

    // Group by supplier
    const supplierData = purchaseOrders.reduce((acc, po) => {
      const supplierName = po.supplier.name
      if (!acc[supplierName]) {
        acc[supplierName] = {
          totalOrders: 0,
          totalQuantity: 0,
          pendingOrders: 0,
          receivedOrders: 0,
        }
      }
      acc[supplierName].totalOrders += 1
      acc[supplierName].totalQuantity += po.quantity
      if (po.status === 'PENDING') {
        acc[supplierName].pendingOrders += 1
      } else if (po.status === 'RECEIVED') {
        acc[supplierName].receivedOrders += 1
      }
      return acc
    }, {} as Record<string, { totalOrders: number; totalQuantity: number; pendingOrders: number; receivedOrders: number }>)

    // Convert to array format
    const chartData = Object.entries(supplierData)
      .map(([supplier, data]) => ({
        supplier,
        totalOrders: data.totalOrders,
        totalQuantity: data.totalQuantity,
        pendingOrders: data.pendingOrders,
        receivedOrders: data.receivedOrders,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders)

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch supplier performance' },
      { status: 500 }
    )
  }
}

