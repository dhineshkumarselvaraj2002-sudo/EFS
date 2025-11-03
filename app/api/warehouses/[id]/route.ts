import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: params.id },
      include: {
        inventory: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }

    return NextResponse.json(warehouse)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch warehouse' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, location } = body

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        name,
        location,
      },
    })

    return NextResponse.json(warehouse)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update warehouse' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.warehouse.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Warehouse deleted' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete warehouse' },
      { status: 500 }
    )
  }
}

