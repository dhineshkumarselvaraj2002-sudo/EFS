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
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    startDate.setDate(now.getDate() - days)

    // Get alerts grouped by date
    const [stockAlerts, expiryAlerts] = await Promise.all([
      prisma.alert.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      prisma.expiryAlert.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ])

    // Group by date
    const dailyData: Record<string, { stock: number; expiry: number }> = {}
    
    stockAlerts.forEach((alert) => {
      const dateKey = new Date(alert.createdAt).toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { stock: 0, expiry: 0 }
      }
      dailyData[dateKey].stock += 1
    })

    expiryAlerts.forEach((alert) => {
      const dateKey = new Date(alert.createdAt).toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { stock: 0, expiry: 0 }
      }
      dailyData[dateKey].expiry += 1
    })

    // Fill in missing dates and convert to array
    const chartData: Array<{ date: string; stock: number; expiry: number }> = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split('T')[0]
      chartData.push({
        date: dateKey,
        stock: dailyData[dateKey]?.stock || 0,
        expiry: dailyData[dateKey]?.expiry || 0,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts trend' },
      { status: 500 }
    )
  }
}

