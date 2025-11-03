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

    // Get batches expiring within 90 days
    const now = new Date()
    const ninetyDaysFromNow = new Date()
    ninetyDaysFromNow.setDate(now.getDate() + 90)

    const batches = await prisma.productBatch.findMany({
      where: {
        expiryDate: {
          lte: ninetyDaysFromNow,
          gte: now,
        },
        quantity: {
          gt: 0,
        },
      },
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    })

    // Group by expiry date range (7-day buckets)
    const chartData: Array<{ period: string; batches: number; quantity: number }> = []
    const grouped: Record<string, { batches: number; quantity: number }> = {}

    batches.forEach((batch) => {
      if (!batch.expiryDate) return

      const expiryDate = new Date(batch.expiryDate)
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      let period: string
      if (daysUntilExpiry <= 7) {
        period = '0-7 days'
      } else if (daysUntilExpiry <= 14) {
        period = '8-14 days'
      } else if (daysUntilExpiry <= 30) {
        period = '15-30 days'
      } else if (daysUntilExpiry <= 60) {
        period = '31-60 days'
      } else {
        period = '61-90 days'
      }

      if (!grouped[period]) {
        grouped[period] = { batches: 0, quantity: 0 }
      }
      grouped[period].batches += 1
      grouped[period].quantity += batch.quantity
    })

    // Convert to array with ordered periods
    const periodOrder = ['0-7 days', '8-14 days', '15-30 days', '31-60 days', '61-90 days']
    periodOrder.forEach((period) => {
      if (grouped[period]) {
        chartData.push({
          period,
          batches: grouped[period].batches,
          quantity: grouped[period].quantity,
        })
      }
    })

    return NextResponse.json(chartData)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expiring batches timeline' },
      { status: 500 }
    )
  }
}

