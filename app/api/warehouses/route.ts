import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: {
            inventory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(warehouses)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch warehouses' },
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
    const { name, location } = body

    if (!name || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        location,
      },
    })

    return NextResponse.json(warehouse, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create warehouse' },
      { status: 500 }
    )
  }
}

