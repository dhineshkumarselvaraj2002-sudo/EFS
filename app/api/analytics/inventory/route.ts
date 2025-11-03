import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          include: {
            productSettings: true,
          },
        },
        warehouse: true,
      },
    })

    const totalInventoryEntries = inventory.length
    const totalQuantity = inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    
    const lowStockInventory = inventory.filter(inv => {
      const minLevel = inv.product.productSettings?.minStockLevel || 0
      return inv.quantity < minLevel && minLevel > 0
    })

    const outOfStockInventory = inventory.filter(inv => inv.quantity === 0)

    const inventoryByCategory = inventory.reduce((acc, inv) => {
      const category = inv.product.category
      if (!acc[category]) {
        acc[category] = { total: 0, items: 0 }
      }
      acc[category].total += inv.quantity
      acc[category].items += 1
      return acc
    }, {} as Record<string, { total: number; items: number }>)

    const inventoryByWarehouse = inventory.reduce((acc, inv) => {
      const warehouseName = inv.warehouse.name
      if (!acc[warehouseName]) {
        acc[warehouseName] = { total: 0, items: 0 }
      }
      acc[warehouseName].total += inv.quantity
      acc[warehouseName].items += 1
      return acc
    }, {} as Record<string, { total: number; items: number }>)

    const avgStockLevel = inventory.length > 0 
      ? inventory.reduce((sum, inv) => sum + inv.quantity, 0) / inventory.length 
      : 0

    return NextResponse.json({
      totalInventoryEntries,
      totalQuantity,
      lowStockCount: lowStockInventory.length,
      outOfStockCount: outOfStockInventory.length,
      avgStockLevel: Math.round(avgStockLevel * 100) / 100,
      inventoryByCategory: Object.entries(inventoryByCategory).map(([category, data]) => ({
        category,
        totalQuantity: data.total,
        itemCount: data.items,
      })),
      inventoryByWarehouse: Object.entries(inventoryByWarehouse).map(([warehouse, data]) => ({
        warehouse,
        totalQuantity: data.total,
        itemCount: data.items,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory analytics' },
      { status: 500 }
    )
  }
}

