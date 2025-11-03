import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkStockAlerts } from '@/lib/utils/check-stock-alerts'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lowStockItems = await checkStockAlerts()

    return NextResponse.json(lowStockItems)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch low stock alerts', details: error.message },
      { status: 500 }
    )
  }
}

