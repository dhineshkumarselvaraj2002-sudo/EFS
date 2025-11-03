import { prisma } from '@/lib/prisma'
import { AlertStatus, PurchaseOrderStatus } from '@prisma/client'

export interface LowStockItem {
  productId: string
  productName: string
  warehouseName?: string
  warehouseId?: string
  currentQuantity: number
  minStockLevel: number
  safetyStock: number
}

/**
 * Check for low stock items across all inventory
 * Returns items where quantity < minStockLevel
 */
export async function checkStockAlerts(): Promise<LowStockItem[]> {
  try {
    // Get all inventory items with their product settings
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

    const lowStockItems: LowStockItem[] = []

    for (const inv of inventory) {
      const minStockLevel = inv.product.productSettings?.minStockLevel || 0
      
      // Only alert if minStockLevel is set and current quantity is below it
      if (minStockLevel > 0 && inv.quantity < minStockLevel) {
        lowStockItems.push({
          productId: inv.productId,
          productName: inv.product.name,
          warehouseName: inv.warehouse?.name,
          warehouseId: inv.warehouseId,
          currentQuantity: inv.quantity,
          minStockLevel,
          safetyStock: inv.product.productSettings?.safetyStock || 0,
        })
      }
    }

    return lowStockItems
  } catch (error) {
    console.error('Error checking stock alerts:', error)
    return []
  }
}

/**
 * Create or update alerts for low stock items
 * Also auto-generates purchase orders when inventory drops below reorder level
 */
export async function createLowStockAlerts(): Promise<{ alertsCreated: number; purchaseOrdersCreated: number; purchaseOrders: any[] }> {
  try {
    const lowStockItems = await checkStockAlerts()
    let alertsCreated = 0
    let purchaseOrdersCreated = 0
    const createdPurchaseOrders: any[] = []

    for (const item of lowStockItems) {
      // Get product with settings and supplier info
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          productSettings: true,
          productSuppliers: {
            include: {
              supplier: true,
            },
            take: 1, // Get first supplier (preferred supplier)
          },
          purchaseOrders: {
            where: {
              status: PurchaseOrderStatus.PENDING,
            },
            take: 1,
          },
        },
      })

      if (!product) continue

      // Check if alert already exists
      const existingAlert = await prisma.alert.findFirst({
        where: {
          productId: item.productId,
          status: AlertStatus.NEW,
          message: {
            contains: 'Low stock',
          },
        },
      })

      if (!existingAlert) {
        const message = item.warehouseName
          ? `Low stock alert: ${item.productName} in ${item.warehouseName} - ${item.currentQuantity} units remaining (min: ${item.minStockLevel})`
          : `Low stock alert: ${item.productName} - ${item.currentQuantity} units remaining (min: ${item.minStockLevel})`

        await prisma.alert.create({
          data: {
            productId: item.productId,
            message,
            status: AlertStatus.NEW,
          },
        })
        alertsCreated++
      }

      // Auto-generate purchase order if:
      // 1. Product has a supplier linked
      // 2. No pending PO exists
      // 3. Product has settings (reorder level defined)
      if (
        product.productSuppliers.length > 0 &&
        product.purchaseOrders.length === 0 &&
        product.productSettings
      ) {
        // Choose supplier with minimum cost (sort by price ascending)
        const sortedSuppliers = [...product.productSuppliers].sort((a, b) => a.price - b.price)
        const supplier = sortedSuppliers[0]
        
        // Calculate reorder quantity (typically 2x min stock level or safety stock + lead time demand)
        const reorderQuantity = product.productSettings.minStockLevel * 2

        try {
          const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
              supplierId: supplier.supplierId,
              productId: item.productId,
              quantity: reorderQuantity,
              status: PurchaseOrderStatus.PENDING,
            },
            include: {
              product: true,
              supplier: true,
            },
          })

          purchaseOrdersCreated++
          createdPurchaseOrders.push(purchaseOrder)

          // Create alert for auto-generated PO
          await prisma.alert.create({
            data: {
              productId: item.productId,
              message: `Auto-generated purchase order: ${item.productName} - ${reorderQuantity} units from ${supplier.supplier.name} (Status: PENDING)`,
              status: AlertStatus.NEW,
            },
          })
        } catch (error) {
          console.error(`Failed to auto-generate PO for product ${item.productId}:`, error)
        }
      }
    }

    return {
      alertsCreated,
      purchaseOrdersCreated,
      purchaseOrders: createdPurchaseOrders,
    }
  } catch (error) {
    console.error('Error creating low stock alerts:', error)
    return { alertsCreated: 0, purchaseOrdersCreated: 0, purchaseOrders: [] }
  }
}

