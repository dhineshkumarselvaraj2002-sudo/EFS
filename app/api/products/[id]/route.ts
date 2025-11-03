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

    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productSettings: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
        batches: {
          include: {
            warehouse: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, sku, category, unit, minStockLevel, safetyStock, leadTimeDays } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        category,
        unit,
        productSettings: (minStockLevel !== undefined || safetyStock !== undefined || leadTimeDays !== undefined) ? {
          upsert: {
            create: { 
              minStockLevel: minStockLevel || 0,
              safetyStock: safetyStock ?? 0,
              leadTimeDays: leadTimeDays ?? 7,
            },
            update: { 
              ...(minStockLevel !== undefined && { minStockLevel }),
              ...(safetyStock !== undefined && { safetyStock }),
              ...(leadTimeDays !== undefined && { leadTimeDays }),
            },
          },
        } : undefined,
      },
      include: {
        productSettings: true,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Product deleted' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}

