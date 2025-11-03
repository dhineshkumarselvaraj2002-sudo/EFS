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
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      include: {
        product: true,
        user: true,
      },
    })

    const totalTransactions = transactions.length
    const transactionsByType = transactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1
      return acc
    }, {} as Record<TransactionType, number>)

    const totalQuantity = transactions.reduce((sum, tx) => sum + tx.quantity, 0)
    const transactionsByTypeQuantity = transactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + tx.quantity
      return acc
    }, {} as Record<TransactionType, number>)

    const transactionsByUser = transactions.reduce((acc, tx) => {
      const userName = tx.user?.name || 'Unknown'
      acc[userName] = (acc[userName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const transactionsByProduct = transactions.reduce((acc, tx) => {
      const productName = tx.product.name
      if (!acc[productName]) {
        acc[productName] = { count: 0, quantity: 0 }
      }
      acc[productName].count += 1
      acc[productName].quantity += tx.quantity
      return acc
    }, {} as Record<string, { count: number; quantity: number }>)

    const topProducts = Object.entries(transactionsByProduct)
      .map(([product, data]) => ({
        product,
        ...data,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    return NextResponse.json({
      totalTransactions,
      totalQuantity,
      transactionsByType: Object.entries(transactionsByType).map(([type, count]) => ({
        type,
        count,
      })),
      transactionsByTypeQuantity: Object.entries(transactionsByTypeQuantity).map(([type, quantity]) => ({
        type,
        quantity,
      })),
      transactionsByUser: Object.entries(transactionsByUser).map(([user, count]) => ({
        user,
        count,
      })),
      topProducts,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions summary' },
      { status: 500 }
    )
  }
}

