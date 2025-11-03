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
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(productId && { productId }),
        ...(warehouseId && {
          OR: [
            { sourceWarehouseId: warehouseId },
            { destinationWarehouseId: warehouseId },
          ],
        }),
        ...(type && { type }),
      },
      include: {
        product: true,
        sourceWarehouse: true,
        destinationWarehouse: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.transaction.count({
      where: {
        ...(productId && { productId }),
        ...(warehouseId && {
          OR: [
            { sourceWarehouseId: warehouseId },
            { destinationWarehouseId: warehouseId },
          ],
        }),
        ...(type && { type }),
      },
    })

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

