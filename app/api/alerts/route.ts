import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { AlertStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const productId = searchParams.get('productId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (status) where.status = status as AlertStatus
    if (productId) where.productId = productId
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }
    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { message: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ])

    return NextResponse.json({
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, markAll } = body

    if (markAll && status) {
      // Mark all alerts as read
      const result = await prisma.alert.updateMany({
        where: { status: 'NEW' },
        data: { status: status as AlertStatus },
      })

      return NextResponse.json({ count: result.count, message: 'All alerts marked as read' })
    }

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: { status: status as AlertStatus },
      include: {
        product: true,
      },
    })

    return NextResponse.json(alert)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

