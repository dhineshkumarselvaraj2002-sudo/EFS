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
            product: {
              include: {
                productSettings: true,
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            location: true,
            type: true,
            status: true,
          },
        },
        sourceTransactions: {
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            product: true,
            destinationWarehouse: true,
          },
        },
        destinationTransactions: {
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            product: true,
            sourceWarehouse: true,
          },
        },
        batches: {
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
    const { name, location, type, status, parentId } = body

    // Validate parentId if provided (prevent circular references)
    if (parentId) {
      if (parentId === params.id) {
        return NextResponse.json(
          { error: 'Warehouse cannot be its own parent' },
          { status: 400 }
        )
      }
      const parent = await prisma.warehouse.findUnique({
        where: { id: parentId },
        include: {
          parent: true,
        },
      })
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent warehouse not found' },
          { status: 400 }
        )
      }
      // Check for circular reference (prevent parent's ancestor from being this warehouse)
      let currentParent = parent.parent
      while (currentParent) {
        if (currentParent.id === params.id) {
          return NextResponse.json(
            { error: 'Circular reference detected in warehouse hierarchy' },
            { status: 400 }
          )
        }
        const parentWarehouse = await prisma.warehouse.findUnique({
          where: { id: currentParent.id },
          include: { parent: true },
        })
        currentParent = parentWarehouse?.parent || null
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        name,
        location,
        type: type !== undefined ? (type || null) : undefined,
        status: status || 'Active',
        parentId: parentId !== undefined ? (parentId || null) : undefined,
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

