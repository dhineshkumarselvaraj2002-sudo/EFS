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
    const days = parseInt(searchParams.get('days') || '90')

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    startDate.setDate(now.getDate() - days)

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Group by date
    const dailyData = transactions.reduce((acc, tx) => {
      const date = new Date(tx.timestamp)
      const dateKey = date.toISOString().split('T')[0]
      
      if (!acc[dateKey]) {
        acc[dateKey] = { stockIn: 0, stockOut: 0 }
      }

      if (tx.type === 'IN') {
        acc[dateKey].stockIn += tx.quantity
      } else if (tx.type === 'OUT') {
        acc[dateKey].stockOut += tx.quantity
      }

      return acc
    }, {} as Record<string, { stockIn: number; stockOut: number }>)

    // Fill in missing dates and convert to array
    const chartData: Array<{ date: string; stockIn: number; stockOut: number }> = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split('T')[0]
      chartData.push({
        date: dateKey,
        stockIn: dailyData[dateKey]?.stockIn || 0,
        stockOut: dailyData[dateKey]?.stockOut || 0,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction timeline' },
      { status: 500 }
    )
  }
}

