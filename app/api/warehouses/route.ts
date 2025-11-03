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
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type && type !== 'all') where.type = type
    if (status && status !== 'all') where.status = status

    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        include: {
          _count: {
            select: {
              inventory: true,
              children: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.warehouse.count({ where }),
    ])

    return NextResponse.json({
      warehouses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
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
    const { name, location, type, status, parentId } = body

    if (!name || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate parentId if provided
    if (parentId) {
      const parent = await prisma.warehouse.findUnique({
        where: { id: parentId },
      })
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent warehouse not found' },
          { status: 400 }
        )
      }
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        location,
        type: type || null,
        status: status || 'Active',
        parentId: parentId || null,
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

