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
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }
    if (search) {
      where.OR = [
        { batch: { product: { name: { contains: search, mode: 'insensitive' } } } },
        { batch: { batchNumber: { contains: search, mode: 'insensitive' } } },
        { message: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (productId) {
      where.batch = { productId }
    }

    const [expiryAlerts, total] = await Promise.all([
      prisma.expiryAlert.findMany({
        where,
        include: {
          batch: {
            include: {
              product: true,
              warehouse: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expiryAlert.count({ where }),
    ])

    return NextResponse.json({
      expiryAlerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch expiry alerts' },
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

    // Check for batches expiring within 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const batchesExpiringSoon = await prisma.productBatch.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        expiryAlerts: {
          where: {
            status: 'NEW',
          },
        },
      },
    })

    const createdAlerts = []

    for (const batch of batchesExpiringSoon) {
      // Only create alert if one doesn't already exist
      if (batch.expiryAlerts.length === 0) {
        const daysUntilExpiry = batch.expiryDate
          ? Math.ceil(
              (batch.expiryDate.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

        const alert = await prisma.expiryAlert.create({
          data: {
            batchId: batch.id,
            message: `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} days`,
            status: 'NEW',
          },
          include: {
            batch: {
              include: {
                product: true,
                warehouse: true,
              },
            },
          },
        })

        createdAlerts.push(alert)
      }
    }

    return NextResponse.json({ alerts: createdAlerts })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check expiry alerts' },
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
      // Mark all expiry alerts as read
      const result = await prisma.expiryAlert.updateMany({
        where: { status: 'NEW' },
        data: { status: status as AlertStatus },
      })

      return NextResponse.json({ count: result.count, message: 'All expiry alerts marked as read' })
    }

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const alert = await prisma.expiryAlert.update({
      where: { id },
      data: { status: status as AlertStatus },
      include: {
        batch: {
          include: {
            product: true,
            warehouse: true,
          },
        },
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

