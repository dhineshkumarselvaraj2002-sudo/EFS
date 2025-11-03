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
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [stockAlerts, expiryAlerts] = await Promise.all([
      prisma.alert.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          product: true,
        },
      }),
      prisma.expiryAlert.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          batch: {
            include: {
              product: true,
            },
          },
        },
      }),
    ])

    const totalAlerts = stockAlerts.length + expiryAlerts.length
    const newAlerts = stockAlerts.filter(a => a.status === 'NEW').length
    const newExpiryAlerts = expiryAlerts.filter(a => a.status === 'NEW').length

    const alertsByStatus = {
      stock: stockAlerts.reduce((acc, alert) => {
        acc[alert.status] = (acc[alert.status] || 0) + 1
        return acc
      }, {} as Record<AlertStatus, number>),
      expiry: expiryAlerts.reduce((acc, alert) => {
        acc[alert.status] = (acc[alert.status] || 0) + 1
        return acc
      }, {} as Record<AlertStatus, number>),
    }

    const alertsByProduct = stockAlerts.reduce((acc, alert) => {
      const productName = alert.product.name
      acc[productName] = (acc[productName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recentAlerts = [
      ...stockAlerts.map(a => ({
        id: a.id,
        type: 'stock' as const,
        message: a.message,
        product: a.product.name,
        status: a.status,
        createdAt: a.createdAt,
      })),
      ...expiryAlerts.map(a => ({
        id: a.id,
        type: 'expiry' as const,
        message: a.message,
        product: a.batch.product.name,
        status: a.status,
        createdAt: a.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)

    return NextResponse.json({
      totalAlerts,
      newAlerts,
      newExpiryAlerts,
      stockAlertsCount: stockAlerts.length,
      expiryAlertsCount: expiryAlerts.length,
      alertsByStatus,
      alertsByProduct: Object.entries(alertsByProduct)
        .map(([product, count]) => ({
          product,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentAlerts,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts summary' },
      { status: 500 }
    )
  }
}

