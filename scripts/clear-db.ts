import { prisma } from '../lib/prisma'

async function clearDatabase() {
  try {
    console.log('🧹 Starting database cleanup...')

    await prisma.$transaction(async (tx) => {
      // Delete in order to respect foreign key constraints
      console.log('  Deleting ExpiryAlerts...')
      await tx.expiryAlert.deleteMany()
      
      console.log('  Deleting Alerts...')
      await tx.alert.deleteMany()
      
      console.log('  Deleting Transactions...')
      await tx.transaction.deleteMany()
      
      console.log('  Deleting ProductBatches...')
      await tx.productBatch.deleteMany()
      
      console.log('  Deleting Inventory...')
      await tx.inventory.deleteMany()
      
      console.log('  Deleting ProductSuppliers...')
      await tx.productSupplier.deleteMany()
      
      console.log('  Deleting PurchaseOrders...')
      await tx.purchaseOrder.deleteMany()
      
      console.log('  Deleting ProductSettings...')
      await tx.productSetting.deleteMany()
      
      console.log('  Deleting Products...')
      await tx.product.deleteMany()
      
      console.log('  Deleting Warehouses...')
      await tx.warehouse.deleteMany()
      
      console.log('  Deleting Suppliers...')
      await tx.supplier.deleteMany()
      
      console.log('  Deleting Users...')
      await tx.user.deleteMany()
    })

    // Get final counts
    const counts = {
      users: await prisma.user.count(),
      warehouses: await prisma.warehouse.count(),
      suppliers: await prisma.supplier.count(),
      products: await prisma.product.count(),
      productSettings: await prisma.productSetting.count(),
      productSuppliers: await prisma.productSupplier.count(),
      inventory: await prisma.inventory.count(),
      batches: await prisma.productBatch.count(),
      expiryAlerts: await prisma.expiryAlert.count(),
      alerts: await prisma.alert.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      transactions: await prisma.transaction.count(),
    }

    console.log('\n✅ Database cleared successfully!')
    console.log('\n📊 Remaining record counts:')
    Object.entries(counts).forEach(([model, count]) => {
      console.log(`  ${model}: ${count}`)
    })
  } catch (error: any) {
    console.error('❌ Error clearing database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
clearDatabase()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

