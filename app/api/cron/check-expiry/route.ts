import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This route can be called by:
// 1. External cron service (cron-job.org, EasyCron, etc.)
// 2. Vercel Cron Jobs (using vercel.json)
// 3. Scheduled task runner

export async function GET(request: NextRequest) {
  try {
    // Optional: Add API key authentication for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for batches expiring within 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const now = new Date()

    const batchesExpiringSoon = await prisma.productBatch.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      include: {
        product: true,
        warehouse: true,
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
      if (batch.expiryAlerts.length === 0 && batch.expiryDate) {
        const daysUntilExpiry = Math.ceil(
          (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const alert = await prisma.expiryAlert.create({
          data: {
            batchId: batch.id,
            message: `Batch ${batch.batchNumber} of ${batch.product.name} expires in ${daysUntilExpiry} days (Warehouse: ${batch.warehouse.name})`,
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

    return NextResponse.json({
      success: true,
      checked: batchesExpiringSoon.length,
      alertsCreated: createdAlerts.length,
      alerts: createdAlerts,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check expiry alerts' },
      { status: 500 }
    )
  }
}

// POST method for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}

