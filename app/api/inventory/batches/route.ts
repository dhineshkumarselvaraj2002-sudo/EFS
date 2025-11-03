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

    if (!productId || !warehouseId) {
      return NextResponse.json(
        { error: 'productId and warehouseId are required' },
        { status: 400 }
      )
    }

    const batches = await prisma.productBatch.findMany({
      where: {
        productId,
        warehouseId,
        quantity: { gt: 0 },
      },
      orderBy: [
        { expiryDate: 'asc' }, // FEFO - First Expire First Out
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json(batches)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch batches', details: error.message },
      { status: 500 }
    )
  }
}

