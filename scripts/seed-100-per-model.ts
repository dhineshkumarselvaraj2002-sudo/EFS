import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth'
import { TransactionType, PurchaseOrderStatus, AlertStatus, UserRole } from '@prisma/client'

// Helper to generate random date with different times
function getRandomDate(startDaysAgo: number, endDaysAgo: number = 0): Date {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - startDaysAgo)
  
  const end = new Date(now)
  end.setDate(end.getDate() - endDaysAgo)
  
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  const date = new Date(randomTime)
  
  // Add random hours, minutes, seconds for variety
  date.setHours(Math.floor(Math.random() * 24))
  date.setMinutes(Math.floor(Math.random() * 60))
  date.setSeconds(Math.floor(Math.random() * 60))
  date.setMilliseconds(Math.floor(Math.random() * 1000))
  
  return date
}

// Generate date spread across past 6 months with varied times
function getVariedDate(index: number, total: number): Date {
  const monthsAgo = (index % 6) // Spread across 6 months
  const daysInMonth = 30
  const dayOffset = Math.floor((index / total) * daysInMonth)
  
  return getRandomDate((monthsAgo * daysInMonth) + dayOffset, (monthsAgo * daysInMonth) + dayOffset - 1)
}

// Product names and categories
const productNames = [
  'Laptop Computer', 'Desktop Monitor', 'Wireless Mouse', 'Mechanical Keyboard', 'USB Cable',
  'Power Adapter', 'Webcam HD', 'Microphone USB', 'Headphones Wireless', 'Speaker Bluetooth',
  'External SSD', 'USB Flash Drive', 'Network Router', 'Ethernet Cable', 'HDMI Cable',
  'Charging Station', 'Power Bank', 'Wireless Charger', 'Smart Watch', 'Fitness Tracker',
  'Office Desk', 'Ergonomic Chair', 'File Cabinet', 'Bookshelf', 'Storage Cabinet',
  'Monitor Stand', 'Laptop Stand', 'Desk Organizer', 'Cable Manager', 'Waste Basket',
  'Printer Paper', 'Notebook Set', 'Stapler Heavy', 'Paper Clips', 'Binder Ring',
  'File Folder', 'Envelope Pack', 'Sticky Notes', 'Highlighter Set', 'Marker Set',
  'Pen Set', 'Pencil Pack', 'Scissors', 'Tape Dispenser', 'Calculator',
  'Whiteboard', 'Dry Erase Marker', 'Eraser', 'Hole Punch', 'Label Maker',
  'Ink Cartridge', 'Toner Cartridge', 'Photo Paper', 'Lamination Sheet', 'Binding Cover',
  'Document Scanner', 'Photo Scanner', 'Label Printer', 'Screwdriver Set', 'Wrench Set',
  'Power Drill', 'Measuring Tape', 'Level Tool', 'Hammer', 'Pliers Set',
  'Utility Knife', 'Toolbox', 'Safety Glasses', 'Safety Helmet', 'Safety Vest',
  'Work Gloves', 'Respirator Mask', 'Ear Protection', 'Safety Boots', 'First Aid Kit',
  'Fire Extinguisher', 'All Purpose Cleaner', 'Disinfectant Wipes', 'Paper Towels', 'Trash Bags',
  'Broom', 'Mop Set', 'Vacuum Cleaner', 'Microfiber Cloths', 'Glass Cleaner',
  'Light Bulbs LED', 'Batteries Pack', 'Extension Cord', 'Power Strip', 'Surge Protector',
  'Air Filter', 'HVAC Filter', 'Replacement Parts', 'Lubricant Oil', 'Cleaning Solution'
]

const categories = [
  'Electronics', 'Furniture', 'Office Supplies', 'Printing & Imaging',
  'Tools & Equipment', 'Safety & PPE', 'Cleaning Supplies', 'Maintenance'
]

const units = ['unit', 'pack', 'set', 'cartridge', 'ream', 'box', 'case', 'pallet']

// Warehouse types and statuses
const warehouseTypes = ['Regional', 'Mobile', 'Retail', 'Temporary', 'Distribution', 'Storage', 'Hub']
const warehouseStatuses = ['Active', 'Inactive']

// Supplier data generators
const supplierNames = Array.from({ length: 100 }, (_, i) => {
  const prefixes = ['Global', 'Premier', 'Elite', 'Apex', 'Summit', 'Pacific', 'Atlantic', 'Continental', 'Universal', 'Premium']
  const suffixes = ['Supplies', 'Distributors', 'Trading', 'Materials', 'Commerce', 'Logistics', 'Wholesale', 'Import', 'Export', 'Group']
  return `${prefixes[i % 10]} ${suffixes[Math.floor(i / 10) % 10]} ${i > 0 ? i : ''}`
})

// Transaction reasons and departments
const reasons = [
  'Stock replenishment', 'Received from supplier', 'Customer order', 'Inter-warehouse transfer',
  'Defective return', 'Customer return', 'Field deployment', 'Maintenance usage',
  'Emergency restock', 'Cycle count', 'Damaged goods', 'Quality control', 'Demo equipment',
  'Sample distribution', 'Inventory adjustment', 'Promotional giveaway', 'Internal use',
  'Warranty replacement', 'Recall processing', 'End of season clearance'
]

const departments = [
  'Field Operations', 'Maintenance', 'Quality Control', 'Warehouse', 'Distribution',
  'Logistics', 'Operations', 'Procurement', 'Sales', 'Customer Service',
  'Production', 'Research', 'Development', 'Marketing', 'Administration'
]

async function seed() {
  try {
    console.log('🌱 Starting seed - creating 100 records for each model...')

    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await prisma.$transaction(async (tx) => {
      await tx.expiryAlert.deleteMany()
      await tx.alert.deleteMany()
      await tx.transaction.deleteMany()
      await tx.productBatch.deleteMany()
      await tx.inventory.deleteMany()
      await tx.productSupplier.deleteMany()
      await tx.purchaseOrder.deleteMany()
      await tx.productSetting.deleteMany()
      await tx.product.deleteMany()
      await tx.warehouse.deleteMany()
      await tx.supplier.deleteMany()
      await tx.user.deleteMany()
    })

    await prisma.$transaction(async (tx) => {
      // 1. Create 100 Users
      console.log('👥 Creating 100 users...')
      const defaultPassword = await hashPassword('password123')
      const createdUsers = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const date = getVariedDate(i, 100)
          const roles: UserRole[] = i < 10 ? ['ADMIN'] : ['USER'] // 10 admins, 90 users
          return tx.user.create({
            data: {
              name: `User ${i + 1}`,
              email: `user${i + 1}@example.com`,
              password: defaultPassword,
              role: roles[0],
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log(`✅ Created ${createdUsers.length} users`)

      // 2. Create 100 Warehouses
      console.log('🏢 Creating 100 warehouses...')
      const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']
      const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA']
      
      const createdWarehouses: any[] = []
      for (let i = 0; i < 100; i++) {
        const date = getVariedDate(i, 100)
        const cityIndex = i % cities.length
        const hasParent = i > 0 && i % 10 === 0 // Every 10th warehouse has a parent
        const parentId = hasParent && createdWarehouses.length > 0 
          ? createdWarehouses[Math.floor(i / 10) - 1]?.id 
          : null
        
        const warehouse = await tx.warehouse.create({
          data: {
            name: `Warehouse ${i + 1} ${warehouseTypes[i % warehouseTypes.length]}`,
            location: `${cities[cityIndex]}, ${states[cityIndex]}`,
            type: warehouseTypes[i % warehouseTypes.length],
            status: warehouseStatuses[i % 2],
            parentId: parentId,
            createdAt: date,
            updatedAt: date,
          },
        })
        createdWarehouses.push(warehouse)
      }
      console.log(`✅ Created ${createdWarehouses.length} warehouses`)

      // 3. Create 100 Suppliers
      console.log('🏭 Creating 100 suppliers...')
      const createdSuppliers = await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const cityIndex = i % cities.length
          return tx.supplier.create({
            data: {
              name: supplierNames[i],
              contactPerson: `Contact Person ${i + 1}`,
              phone: `+1-${555 + (i % 900)}-${String(1000 + i).padStart(4, '0')}`,
              email: `contact${i + 1}@${supplierNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
              address: `${100 + i} Commerce Street, ${cities[cityIndex]}, ${states[cityIndex]} ${10000 + i}`,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log(`✅ Created ${createdSuppliers.length} suppliers`)

      // 4. Create 100 Products
      console.log('📦 Creating 100 products...')
      const createdProducts = await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const category = categories[i % categories.length]
          const unit = units[i % units.length]
          const prefix = productNames[i]?.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD'
          return tx.product.create({
            data: {
              name: productNames[i] || `Product ${i + 1}`,
              sku: `${prefix}-${String(i + 1).padStart(4, '0')}`,
              category: category,
              unit: unit,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log(`✅ Created ${createdProducts.length} products`)

      // 5. Create 100 ProductSettings
      console.log('⚙️ Creating 100 product settings...')
      await Promise.all(
        createdProducts.map((product, i) => {
          const date = getVariedDate(i, 100)
          const categoryFactor = product.category === 'Electronics' ? 3 : product.category === 'Furniture' ? 2 : 1
          return tx.productSetting.create({
            data: {
              productId: product.id,
              minStockLevel: (10 * categoryFactor) + Math.floor(Math.random() * 20),
              safetyStock: (5 * categoryFactor) + Math.floor(Math.random() * 10),
              leadTimeDays: Math.floor(Math.random() * 14) + 3,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 product settings')

      // 6. Create 100 ProductSuppliers (at least one per product)
      console.log('🔗 Creating 100 product-supplier relationships...')
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const product = createdProducts[i]
          const supplier = createdSuppliers[i]
          const date = getVariedDate(i, 100)
          let basePrice = 10
          if (product.category === 'Electronics') basePrice = 50 + Math.random() * 950
          else if (product.category === 'Furniture') basePrice = 100 + Math.random() * 900
          else if (product.category === 'Tools & Equipment') basePrice = 20 + Math.random() * 480
          else basePrice = 5 + Math.random() * 95
          
          return tx.productSupplier.create({
            data: {
              productId: product.id,
              supplierId: supplier.id,
              price: Math.round(basePrice * 100) / 100,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 product-supplier relationships')

      // 7. Create 100 Inventory entries
      console.log('📊 Creating 100 inventory entries...')
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const product = createdProducts[i]
          const warehouse = createdWarehouses[i]
          let quantity = 10
          if (product.category === 'Electronics') quantity = 5 + Math.floor(Math.random() * 45)
          else if (product.category === 'Furniture') quantity = 2 + Math.floor(Math.random() * 18)
          else quantity = 20 + Math.floor(Math.random() * 180)
          
          return tx.inventory.create({
            data: {
              productId: product.id,
              warehouseId: warehouse.id,
              quantity: quantity,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 inventory entries')

      // 8. Create 100 ProductBatches
      console.log('📦 Creating 100 product batches...')
      const createdBatches = await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const product = createdProducts[i]
          const warehouse = createdWarehouses[i]
          const now = new Date()
          
          // Varied expiry dates - some expired, some soon, some far
          let expiryDate: Date
          const rand = Math.random()
          if (rand < 0.2) {
            // 20% expired (1-30 days ago)
            expiryDate = new Date(now.getTime() - (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000)
          } else if (rand < 0.5) {
            // 30% expiring soon (1-30 days)
            expiryDate = new Date(now.getTime() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000)
          } else if (rand < 0.8) {
            // 30% mid-term (31-90 days)
            expiryDate = new Date(now.getTime() + (Math.random() * 60 + 30) * 24 * 60 * 60 * 1000)
          } else {
            // 20% long-term (91-365 days)
            expiryDate = new Date(now.getTime() + (Math.random() * 274 + 91) * 24 * 60 * 60 * 1000)
          }
          
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const batchNum = String(i + 1).padStart(5, '0')
          
          return tx.productBatch.create({
            data: {
              productId: product.id,
              warehouseId: warehouse.id,
              batchNumber: `BATCH-${year}${month}-${batchNum}`,
              expiryDate: expiryDate,
              quantity: Math.floor(Math.random() * 150) + 5,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log(`✅ Created ${createdBatches.length} product batches`)

      // 9. Create 100 ExpiryAlerts
      console.log('⚠️ Creating 100 expiry alerts...')
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const batch = createdBatches[i]
          const expiryDate = batch.expiryDate || new Date()
          const now = new Date()
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          return tx.expiryAlert.create({
            data: {
              batchId: batch.id,
              message: `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} days (${expiryDate.toLocaleDateString()})`,
              status: Math.random() > 0.4 ? AlertStatus.NEW : AlertStatus.READ,
              createdAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 expiry alerts')

      // 10. Create 100 Alerts (Low Stock)
      console.log('🔔 Creating 100 low stock alerts...')
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const product = createdProducts[i]
          
          return tx.alert.create({
            data: {
              productId: product.id,
              message: `Low stock alert for ${product.name} - Current stock below minimum level`,
              status: Math.random() > 0.3 ? AlertStatus.NEW : AlertStatus.READ,
              createdAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 low stock alerts')

      // 11. Create 100 PurchaseOrders
      console.log('🛒 Creating 100 purchase orders...')
      const poStatuses = [PurchaseOrderStatus.PENDING, PurchaseOrderStatus.SENT, PurchaseOrderStatus.RECEIVED]
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const product = createdProducts[i]
          const supplier = createdSuppliers[i]
          const status = poStatuses[i % 3]
          
          return tx.purchaseOrder.create({
            data: {
              supplierId: supplier.id,
              productId: product.id,
              quantity: Math.floor(Math.random() * 150) + 25,
              status: status,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 purchase orders')

      // 12. Create 100 Transactions
      console.log('💱 Creating 100 transactions...')
      const transactionTypes = [TransactionType.IN, TransactionType.OUT, TransactionType.TRANSFER, TransactionType.RETURN, TransactionType.USAGE]
      
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const date = getVariedDate(i, 100)
          const product = createdProducts[i]
          const type = transactionTypes[i % transactionTypes.length]
          const reason = reasons[i % reasons.length]
          const department = (type === TransactionType.USAGE || type === TransactionType.RETURN)
            ? departments[i % departments.length]
            : undefined
          const user = createdUsers[i % createdUsers.length]
          
          let sourceWarehouseId: string | undefined
          let destinationWarehouseId: string | undefined
          
          if (type === TransactionType.IN || type === TransactionType.RETURN) {
            destinationWarehouseId = createdWarehouses[i % createdWarehouses.length].id
          } else if (type === TransactionType.OUT || type === TransactionType.USAGE) {
            sourceWarehouseId = createdWarehouses[i % createdWarehouses.length].id
          } else {
            // TRANSFER
            const wh1 = createdWarehouses[i % createdWarehouses.length]
            const wh2 = createdWarehouses[(i + 1) % createdWarehouses.length]
            sourceWarehouseId = wh1.id
            destinationWarehouseId = wh2.id
          }
          
          return tx.transaction.create({
            data: {
              productId: product.id,
              sourceWarehouseId,
              destinationWarehouseId,
              quantity: Math.floor(Math.random() * 100) + 1,
              type: type,
              userId: user.id,
              reason: reason,
              department: department || null,
              timestamp: date,
              createdAt: date,
            },
          })
        })
      )
      console.log('✅ Created 100 transactions')
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

    console.log('\n✅ Database seeded successfully!')
    console.log('\n📊 Record counts:')
    Object.entries(counts).forEach(([model, count]) => {
      console.log(`  ${model}: ${count}`)
    })
    console.log('\n🔑 Default password for all users: password123')
    console.log('📅 All dates spread across past 6 months with varied times')
  } catch (error: any) {
    console.error('❌ Seed error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
seed()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

