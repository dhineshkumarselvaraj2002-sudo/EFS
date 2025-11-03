import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { TransactionType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '6m' // 6m, 30d, 7d

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '6m':
        startDate.setMonth(now.getMonth() - 6)
        break
      default:
        startDate.setMonth(now.getMonth() - 6)
    }

    // Get transactions grouped by month/day
    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Group by period
    const grouped = transactions.reduce((acc, tx) => {
      const date = new Date(tx.timestamp)
      let key: string
      
      if (period === '7d') {
        key = date.toLocaleDateString('en-US', { weekday: 'short' })
      } else if (period === '30d') {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else {
        key = date.toLocaleDateString('en-US', { month: 'long' })
      }

      if (!acc[key]) {
        acc[key] = { IN: 0, OUT: 0, TRANSFER: 0, RETURN: 0, USAGE: 0 }
      }

      if (tx.type in acc[key]) {
        acc[key][tx.type as keyof typeof acc[key]] += tx.quantity
      }
      return acc
    }, {} as Record<string, { IN: number; OUT: number; TRANSFER: number; RETURN: number; USAGE: number }>)

    // Convert to array format for charts
    const chartData = Object.entries(grouped).map(([period, data]) => ({
      period,
      stockIn: data.IN,
      stockOut: data.OUT,
      transfers: data.TRANSFER,
      returns: data.RETURN,
      usage: data.USAGE,
    }))

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction analytics' },
      { status: 500 }
    )
  }
}

