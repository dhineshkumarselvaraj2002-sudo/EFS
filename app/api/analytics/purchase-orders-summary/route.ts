import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '90')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        supplier: true,
        product: true,
      },
    })

    const totalOrders = purchaseOrders.length
    const totalQuantity = purchaseOrders.reduce((sum, po) => sum + po.quantity, 0)

    const ordersByStatus = purchaseOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1
      return acc
    }, {} as Record<PurchaseOrderStatus, number>)

    const ordersBySupplier = purchaseOrders.reduce((acc, po) => {
      const supplierName = po.supplier.name
      if (!acc[supplierName]) {
        acc[supplierName] = { count: 0, quantity: 0 }
      }
      acc[supplierName].count += 1
      acc[supplierName].quantity += po.quantity
      return acc
    }, {} as Record<string, { count: number; quantity: number }>)

    const ordersByProduct = purchaseOrders.reduce((acc, po) => {
      const productName = po.product.name
      if (!acc[productName]) {
        acc[productName] = { count: 0, quantity: 0 }
      }
      acc[productName].count += 1
      acc[productName].quantity += po.quantity
      return acc
    }, {} as Record<string, { count: number; quantity: number }>)

    const recentOrders = purchaseOrders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(po => ({
        id: po.id,
        product: po.product.name,
        supplier: po.supplier.name,
        quantity: po.quantity,
        status: po.status,
        createdAt: po.createdAt,
      }))

    return NextResponse.json({
      totalOrders,
      totalQuantity,
      ordersByStatus: Object.entries(ordersByStatus).map(([status, count]) => ({
        status,
        count,
      })),
      ordersBySupplier: Object.entries(ordersBySupplier).map(([supplier, data]) => ({
        supplier,
        ...data,
      })),
      ordersByProduct: Object.entries(ordersByProduct)
        .map(([product, data]) => ({
          product,
          ...data,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
      recentOrders,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchase orders summary' },
      { status: 500 }
    )
  }
}

