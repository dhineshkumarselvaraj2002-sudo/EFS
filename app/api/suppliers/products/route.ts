import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, supplierId, price } = body

    if (!productId || !supplierId || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const productSupplier = await prisma.productSupplier.upsert({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
      create: {
        productId,
        supplierId,
        price,
      },
      update: {
        price,
      },
    })

    return NextResponse.json(productSupplier, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to associate product with supplier' },
      { status: 500 }
    )
  }
}

