import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const productId = searchParams.get('productId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    // If productId filter, need to filter suppliers that have this product
    let supplierIds: string[] | undefined
    if (productId) {
      const productSuppliers = await prisma.productSupplier.findMany({
        where: { productId },
        select: { supplierId: true },
      })
      supplierIds = productSuppliers.map(ps => ps.supplierId)
      if (supplierIds.length === 0) {
        return NextResponse.json({
          suppliers: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        })
      }
      where.id = { in: supplierIds }
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              purchaseOrders: true,
            },
          },
          productSuppliers: {
            include: {
              product: true,
            },
          },
          purchaseOrders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ])

    return NextResponse.json({
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, contactPerson, phone, email, address } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson,
        phone,
        email,
        address,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}

