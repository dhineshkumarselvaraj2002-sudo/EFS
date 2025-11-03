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
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')

    const batches = await prisma.productBatch.findMany({
      where: {
        ...(productId && { productId }),
        ...(warehouseId && { warehouseId }),
      },
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: [
        { expiryDate: 'asc' }, // FEFO - First Expire First Out
      ],
    })

    return NextResponse.json(batches)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
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
    const { productId, batchNumber, expiryDate, quantity, warehouseId } = body

    if (!productId || !batchNumber || !quantity || !warehouseId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const batch = await prisma.productBatch.upsert({
      where: {
        productId_batchNumber_warehouseId: {
          productId,
          batchNumber,
          warehouseId,
        },
      },
      create: {
        productId,
        batchNumber,
        warehouseId,
        quantity,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      update: {
        quantity: {
          increment: quantity,
        },
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      include: {
        product: true,
        warehouse: true,
      },
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create/update batch' },
      { status: 500 }
    )
  }
}

