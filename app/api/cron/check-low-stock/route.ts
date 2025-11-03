import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderStatus } from '@prisma/client'

// This route checks all products for low stock and auto-generates POs if needed

export async function GET(request: NextRequest) {
  try {
    // Optional: Add API key authentication for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all products with settings
    const products = await prisma.product.findMany({
      include: {
        productSettings: true,
        inventory: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        purchaseOrders: {
          where: {
            status: PurchaseOrderStatus.PENDING,
          },
        },
      },
    })

    const results = {
      checked: 0,
      lowStockProducts: [] as any[],
      purchaseOrdersCreated: [] as any[],
      skipped: [] as any[],
    }

    for (const product of products) {
      results.checked++

      // Skip if no product settings
      if (!product.productSettings) {
        results.skipped.push({
          productId: product.id,
          productName: product.name,
          reason: 'No product settings (min stock level not configured)',
        })
        continue
      }

      // Skip if no supplier
      if (product.productSuppliers.length === 0) {
        results.skipped.push({
          productId: product.id,
          productName: product.name,
          reason: 'No supplier associated',
        })
        continue
      }

      // Calculate total inventory across all warehouses
      const totalQuantity = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      )

      // Check if below min stock level
      if (totalQuantity < product.productSettings.minStockLevel) {
        results.lowStockProducts.push({
          productId: product.id,
          productName: product.name,
          currentStock: totalQuantity,
          minStockLevel: product.productSettings.minStockLevel,
        })

        // Skip if there's already a pending PO
        if (product.purchaseOrders.length > 0) {
          results.skipped.push({
            productId: product.id,
            productName: product.name,
            reason: 'Pending purchase order already exists',
            existingPO: product.purchaseOrders[0].id,
          })
          continue
        }

        // Create purchase order using first supplier
        const supplier = product.productSuppliers[0]
        const reorderQuantity = product.productSettings.minStockLevel * 2

        try {
          const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
              supplierId: supplier.supplierId,
              productId: product.id,
              quantity: reorderQuantity,
              status: PurchaseOrderStatus.PENDING,
            },
            include: {
              product: true,
              supplier: true,
            },
          })

          results.purchaseOrdersCreated.push({
            purchaseOrderId: purchaseOrder.id,
            productName: product.name,
            supplierName: purchaseOrder.supplier.name,
            quantity: purchaseOrder.quantity,
          })
        } catch (error: any) {
          results.skipped.push({
            productId: product.id,
            productName: product.name,
            reason: `Failed to create PO: ${error.message}`,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      summary: {
        totalChecked: results.checked,
        lowStockFound: results.lowStockProducts.length,
        purchaseOrdersGenerated: results.purchaseOrdersCreated.length,
        skipped: results.skipped.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check low stock' },
      { status: 500 }
    )
  }
}

// POST method for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}

