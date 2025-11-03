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

    const suppliers = await prisma.supplier.findMany({
      include: {
        productSuppliers: {
          include: {
            product: true,
          },
        },
        purchaseOrders: true,
      },
    })

    const totalSuppliers = suppliers.length
    const suppliersWithProducts = suppliers.filter(s => s.productSuppliers.length > 0).length
    const suppliersWithOrders = suppliers.filter(s => s.purchaseOrders.length > 0).length

    const supplierStats = suppliers.map(supplier => {
      const totalProducts = supplier.productSuppliers.length
      const totalOrders = supplier.purchaseOrders.length
      const pendingOrders = supplier.purchaseOrders.filter(po => po.status === 'PENDING').length
      const completedOrders = supplier.purchaseOrders.filter(po => po.status === 'RECEIVED').length
      const totalOrderQuantity = supplier.purchaseOrders.reduce((sum, po) => sum + po.quantity, 0)
      const avgPrice = supplier.productSuppliers.length > 0
        ? supplier.productSuppliers.reduce((sum, ps) => sum + ps.price, 0) / supplier.productSuppliers.length
        : 0

      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        totalProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalOrderQuantity,
        avgPrice: Math.round(avgPrice * 100) / 100,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      }
    })

    const topSuppliers = [...supplierStats]
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)

    const suppliersByPerformance = [...supplierStats]
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 10)

    return NextResponse.json({
      totalSuppliers,
      suppliersWithProducts,
      suppliersWithOrders,
      supplierStats,
      topSuppliers,
      suppliersByPerformance,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suppliers analytics' },
      { status: 500 }
    )
  }
}

