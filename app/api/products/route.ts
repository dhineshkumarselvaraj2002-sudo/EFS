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
    const category = searchParams.get('category')

    const products = await prisma.product.findMany({
      where: category ? { category } : undefined,
      include: {
        productSettings: true,
        _count: {
          select: {
            inventory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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
    const { name, sku, category, unit, minStockLevel, safetyStock, leadTimeDays } = body

    if (!name || !sku || !category || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category,
        unit,
        productSettings: (minStockLevel !== undefined || safetyStock !== undefined || leadTimeDays !== undefined) ? {
          create: {
            minStockLevel: minStockLevel || 0,
            safetyStock: safetyStock ?? 0,
            leadTimeDays: leadTimeDays ?? 7,
          },
        } : undefined,
      },
      include: {
        productSettings: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}

