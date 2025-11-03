import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: productId } = await params

    // Get all suppliers linked to this product with their prices
    const productSuppliers = await prisma.productSupplier.findMany({
      where: { productId },
      include: {
        supplier: true,
      },
      orderBy: {
        price: 'asc', // Order by price (cheapest first)
      },
    })

    // Format response with supplier info and price
    const suppliers = productSuppliers.map(ps => ({
      id: ps.supplier.id,
      name: ps.supplier.name,
      contactPerson: ps.supplier.contactPerson,
      email: ps.supplier.email,
      phone: ps.supplier.phone,
      address: ps.supplier.address,
      price: ps.price,
    }))

    return NextResponse.json(suppliers)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch linked suppliers' },
      { status: 500 }
    )
  }
}

