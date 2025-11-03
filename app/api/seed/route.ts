import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { TransactionType, PurchaseOrderStatus, AlertStatus } from '@prisma/client'

// Helper function to generate random date within last 3 months
function getRandomDateInLast3Months(): Date {
  const now = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  const randomTime = threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime())
  return new Date(randomTime)
}

// Helper to get date N days ago
function getDateDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export async function POST(request: NextRequest) {
  try {
    // Check if data already exists
    const existingProducts = await prisma.product.count()
    if (existingProducts > 0) {
      return NextResponse.json(
        { error: 'Database already contains data. Clear database first if you want to reseed.' },
        { status: 400 }
      )
    }

    // Start seeding in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create or Update Users (using upsert to handle existing users)
      const adminPassword = await hashPassword('admin123')
      const userPassword = await hashPassword('user123')

      const admin = await tx.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
          name: 'Admin User',
          password: adminPassword,
          role: 'ADMIN',
        },
        create: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: adminPassword,
          role: 'ADMIN',
        },
      })

      const user = await tx.user.upsert({
        where: { email: 'user@example.com' },
        update: {
          name: 'Test User',
          password: userPassword,
          role: 'USER',
        },
        create: {
          name: 'Test User',
          email: 'user@example.com',
          password: userPassword,
          role: 'USER',
        },
      })

      // 2. Create 50 Warehouses
      const warehouseNames = [
        'Main Warehouse', 'Secondary Warehouse', 'Distribution Center', 'Regional Hub', 'Storage Facility',
        'West Coast Depot', 'East Coast Depot', 'Central Warehouse', 'North Warehouse', 'South Warehouse',
        'Coastal Storage', 'Mountain Depot', 'Plains Distribution', 'Urban Center', 'Suburban Facility',
        'Port Warehouse', 'Airport Terminal', 'Railway Depot', 'Highway Hub', 'Metro Storage',
        'Alpha Facility', 'Beta Warehouse', 'Gamma Depot', 'Delta Center', 'Epsilon Storage',
        'Primary Hub', 'Secondary Hub', 'Tertiary Hub', 'Quaternary Hub', 'Quinary Hub',
        'Warehouse North', 'Warehouse South', 'Warehouse East', 'Warehouse West', 'Warehouse Central',
        'Logistics Center 1', 'Logistics Center 2', 'Logistics Center 3', 'Logistics Center 4', 'Logistics Center 5',
        'Storage Unit A', 'Storage Unit B', 'Storage Unit C', 'Storage Unit D', 'Storage Unit E',
        'Distribution Point 1', 'Distribution Point 2', 'Distribution Point 3', 'Distribution Point 4', 'Distribution Point 5'
      ]
      
      const locations = [
        'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
        'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
        'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
        'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
        'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK',
        'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD',
        'Milwaukee, WI', 'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA',
        'Mesa, AZ', 'Kansas City, MO', 'Atlanta, GA', 'Omaha, NE', 'Raleigh, NC',
        'Miami, FL', 'Long Beach, CA', 'Virginia Beach, VA', 'Oakland, CA', 'Minneapolis, MN',
        'Tulsa, OK', 'Arlington, TX', 'Tampa, FL', 'New Orleans, LA', 'Cleveland, OH'
      ]

      const createdWarehouses = await Promise.all(
        Array.from({ length: 50 }, (_, i) => {
          const date = getRandomDateInLast3Months()
          return tx.warehouse.create({
            data: {
              name: warehouseNames[i] || `Warehouse ${i + 1}`,
              location: locations[i] || `Location ${i + 1}`,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      // 3. Create 50 Suppliers
      const supplierNames = [
        'Global Supplies Inc.', 'Tech Materials Co.', 'Industrial Parts Ltd.', 'Premium Components Corp', 'Elite Distributors',
        'Advanced Materials Co', 'Quality Goods Inc', 'Mega Suppliers LLC', 'Prime Sourcing Ltd', 'Best Value Industries',
        'Enterprise Solutions', 'Commercial Supplies', 'Wholesale Distributors', 'Bulk Materials Co', 'Fast Track Suppliers',
        'Reliable Sources Inc', 'Trusted Partners Ltd', 'Professional Supply Co', 'Corporate Materials', 'Business Solutions Inc',
        'Apex Distributors', 'Summit Suppliers', 'Peak Materials Co', 'Valley Supply Chain', 'Ridge Logistics',
        'Coastal Commerce', 'Pacific Suppliers', 'Atlantic Trading', 'Midwest Materials', 'Southeast Distributors',
        'Northern Supplies', 'Southern Goods', 'Eastern Traders', 'Western Distribution', 'Central Commerce',
        'Alpha Suppliers', 'Beta Materials', 'Gamma Distributors', 'Delta Trading', 'Epsilon Supplies',
        'First Rate Suppliers', 'Top Tier Materials', 'Premium Partners', 'Elite Commerce', 'Superior Supply',
        'Master Distributors', 'Expert Suppliers', 'Pro Materials Co', 'Ace Distributors', 'Star Supplies Inc'
      ]

      const contacts = ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams', 'Charlie Brown', 'Diana Prince', 'Edward Norton', 'Fiona Apple', 'George Lucas', 'Helen Keller']
      const domains = ['supplies.com', 'materials.com', 'distributors.com', 'sourcing.com', 'trading.com', 'commerce.com', 'logistics.com', 'parts.com', 'goods.com', 'supply.com']

      const createdSuppliers = await Promise.all(
        Array.from({ length: 50 }, (_, i) => {
          const date = getRandomDateInLast3Months()
          const contact = contacts[i % contacts.length]
          const domain = domains[i % domains.length]
          const nameSlug = supplierNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')
          
          return tx.supplier.create({
            data: {
              name: supplierNames[i],
              contactPerson: `${contact} ${i > 9 ? Math.floor(i / 10) : ''}`.trim(),
              phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
              email: `${contact.toLowerCase().replace(' ', '.')}${i > 9 ? i : ''}@${nameSlug}.com`,
              address: `${100 + i} Business Ave, ${locations[i] || 'New York, NY'} ${10000 + i}`,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      // 4. Create 100 Products
      const productTemplates = [
        { name: 'Laptop Computer', category: 'Electronics', unit: 'unit' },
        { name: 'Office Chair', category: 'Furniture', unit: 'unit' },
        { name: 'Printer Paper', category: 'Office Supplies', unit: 'ream' },
        { name: 'Stapler', category: 'Office Supplies', unit: 'unit' },
        { name: 'Monitor', category: 'Electronics', unit: 'unit' },
        { name: 'Keyboard', category: 'Electronics', unit: 'unit' },
        { name: 'Mouse', category: 'Electronics', unit: 'unit' },
        { name: 'Desk Lamp', category: 'Furniture', unit: 'unit' },
        { name: 'Notebooks', category: 'Office Supplies', unit: 'pack' },
        { name: 'Pen Set', category: 'Office Supplies', unit: 'set' },
        { name: 'Headphones', category: 'Electronics', unit: 'unit' },
        { name: 'USB Drive', category: 'Electronics', unit: 'unit' },
        { name: 'Webcam', category: 'Electronics', unit: 'unit' },
        { name: 'Microphone', category: 'Electronics', unit: 'unit' },
        { name: 'Desk Organizer', category: 'Furniture', unit: 'unit' },
        { name: 'File Cabinet', category: 'Furniture', unit: 'unit' },
        { name: 'Printer Ink', category: 'Office Supplies', unit: 'cartridge' },
        { name: 'Sticky Notes', category: 'Office Supplies', unit: 'pack' },
        { name: 'Paper Clips', category: 'Office Supplies', unit: 'box' },
        { name: 'Binder', category: 'Office Supplies', unit: 'unit' },
        { name: 'Tablet', category: 'Electronics', unit: 'unit' },
        { name: 'Smartphone', category: 'Electronics', unit: 'unit' },
        { name: 'Charging Cable', category: 'Electronics', unit: 'unit' },
        { name: 'Power Bank', category: 'Electronics', unit: 'unit' },
        { name: 'Laptop Stand', category: 'Furniture', unit: 'unit' },
        { name: 'Monitor Stand', category: 'Furniture', unit: 'unit' },
        { name: 'Cable Manager', category: 'Furniture', unit: 'unit' },
        { name: 'Desk Mat', category: 'Furniture', unit: 'unit' },
        { name: 'Tape Dispenser', category: 'Office Supplies', unit: 'unit' },
        { name: 'Scissors', category: 'Office Supplies', unit: 'unit' },
        { name: 'Hole Punch', category: 'Office Supplies', unit: 'unit' },
        { name: 'Label Maker', category: 'Office Supplies', unit: 'unit' },
        { name: 'Calculator', category: 'Electronics', unit: 'unit' },
        { name: 'External Hard Drive', category: 'Electronics', unit: 'unit' },
        { name: 'Router', category: 'Electronics', unit: 'unit' },
        { name: 'Switch', category: 'Electronics', unit: 'unit' },
        { name: 'Ethernet Cable', category: 'Electronics', unit: 'unit' },
        { name: 'Wireless Mouse', category: 'Electronics', unit: 'unit' },
        { name: 'Ergonomic Keyboard', category: 'Electronics', unit: 'unit' },
        { name: 'Standing Desk', category: 'Furniture', unit: 'unit' },
        { name: 'Office Desk', category: 'Furniture', unit: 'unit' },
        { name: 'Bookshelf', category: 'Furniture', unit: 'unit' },
        { name: 'Meeting Table', category: 'Furniture', unit: 'unit' },
        { name: 'Whiteboard', category: 'Office Supplies', unit: 'unit' },
        { name: 'Markers', category: 'Office Supplies', unit: 'pack' },
        { name: 'Erasers', category: 'Office Supplies', unit: 'pack' },
        { name: 'Highlighters', category: 'Office Supplies', unit: 'pack' },
        { name: 'Index Cards', category: 'Office Supplies', unit: 'pack' },
        { name: 'Envelopes', category: 'Office Supplies', unit: 'pack' },
        { name: 'Folders', category: 'Office Supplies', unit: 'pack' },
        { name: 'Projector', category: 'Electronics', unit: 'unit' },
        { name: 'Projector Screen', category: 'Office Supplies', unit: 'unit' },
        { name: 'Presentation Remote', category: 'Electronics', unit: 'unit' },
        { name: 'HDMI Cable', category: 'Electronics', unit: 'unit' },
        { name: 'VGA Cable', category: 'Electronics', unit: 'unit' },
        { name: 'Extension Cord', category: 'Electronics', unit: 'unit' },
        { name: 'Surge Protector', category: 'Electronics', unit: 'unit' },
        { name: 'Desk Fan', category: 'Electronics', unit: 'unit' },
        { name: 'Space Heater', category: 'Electronics', unit: 'unit' },
        { name: 'Air Purifier', category: 'Electronics', unit: 'unit' },
        { name: 'White Noise Machine', category: 'Electronics', unit: 'unit' },
        { name: 'Coffee Maker', category: 'Electronics', unit: 'unit' },
        { name: 'Water Cooler', category: 'Electronics', unit: 'unit' },
        { name: 'Refrigerator', category: 'Electronics', unit: 'unit' },
        { name: 'Microwave', category: 'Electronics', unit: 'unit' },
        { name: 'Waste Basket', category: 'Furniture', unit: 'unit' },
        { name: 'Recycling Bin', category: 'Furniture', unit: 'unit' },
        { name: 'Coat Rack', category: 'Furniture', unit: 'unit' },
        { name: 'Umbrella Stand', category: 'Furniture', unit: 'unit' },
        { name: 'Plant Stand', category: 'Furniture', unit: 'unit' },
        { name: 'Wall Clock', category: 'Office Supplies', unit: 'unit' },
        { name: 'Calendar', category: 'Office Supplies', unit: 'unit' },
        { name: 'Planner', category: 'Office Supplies', unit: 'unit' },
        { name: 'Time Tracker', category: 'Office Supplies', unit: 'unit' },
        { name: 'Desk Name Plate', category: 'Office Supplies', unit: 'unit' },
        { name: 'Badge Holder', category: 'Office Supplies', unit: 'unit' },
        { name: 'Lanyard', category: 'Office Supplies', unit: 'unit' },
        { name: 'Clipboard', category: 'Office Supplies', unit: 'unit' },
        { name: 'Portable Whiteboard', category: 'Office Supplies', unit: 'unit' },
        { name: 'Dry Erase Markers Set', category: 'Office Supplies', unit: 'set' },
        { name: 'Eraser Cleaner', category: 'Office Supplies', unit: 'bottle' },
        { name: 'Document Scanner', category: 'Electronics', unit: 'unit' },
        { name: 'Fax Machine', category: 'Electronics', unit: 'unit' },
        { name: 'Copier', category: 'Electronics', unit: 'unit' },
        { name: 'Shredder', category: 'Electronics', unit: 'unit' },
        { name: 'Laminator', category: 'Electronics', unit: 'unit' },
        { name: 'Binding Machine', category: 'Electronics', unit: 'unit' },
        { name: 'Paper Trimmer', category: 'Office Supplies', unit: 'unit' },
        { name: 'Corner Rounder', category: 'Office Supplies', unit: 'unit' },
      ]

      const createdProducts = await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const template = productTemplates[i % productTemplates.length]
          const date = getRandomDateInLast3Months()
          const variant = i >= productTemplates.length ? ` ${Math.floor(i / productTemplates.length) + 1}` : ''
          
          return tx.product.create({
            data: {
              name: `${template.name}${variant}`,
              sku: `${template.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')}-${String(i + 1).padStart(3, '0')}`,
              category: template.category,
              unit: template.unit,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      // 5. Create Product Settings for all products
      await Promise.all(
        createdProducts.map((product, index) => {
          const date = getRandomDateInLast3Months()
          return tx.productSetting.create({
            data: {
              productId: product.id,
              minStockLevel: Math.floor(Math.random() * 20) + 5, // Random between 5-24
              safetyStock: Math.floor(Math.random() * 15) + 5, // Random between 5-19
              leadTimeDays: Math.floor(Math.random() * 14) + 3, // Random between 3-16 days
              createdAt: date,
              updatedAt: date,
            } as any, // Type assertion needed until Prisma client regenerates
          })
        })
      )

      // 6. Create Product Suppliers (associate products with suppliers - some products have multiple suppliers)
      const productSupplierEntries: Array<{ productId: string; supplierId: string; price: number }> = []
      for (let i = 0; i < createdProducts.length; i++) {
        const product = createdProducts[i]
        // Each product has 1-3 suppliers
        const numSuppliers = Math.floor(Math.random() * 3) + 1 // 1-3 suppliers per product
        const selectedSuppliers = createdSuppliers
          .sort(() => Math.random() - 0.5)
          .slice(0, numSuppliers)
        
        selectedSuppliers.forEach((supplier) => {
          const basePrice = (Math.random() * 900 + 10) // Random price between 10-910
          productSupplierEntries.push({
            productId: product.id,
            supplierId: supplier.id,
            price: Math.round(basePrice * 100) / 100, // Round to 2 decimals
          })
        })
      }

      await Promise.all(
        productSupplierEntries.map((entry) => {
          return tx.productSupplier.create({
            data: {
              productId: entry.productId,
              supplierId: entry.supplierId,
              price: entry.price,
            },
          })
        })
      )

      // 7. Create Inventory (100 products × multiple warehouses = ~300 entries)
      const inventoryEntries: Array<{ productId: string; warehouseId: string; quantity: number }> = []
      for (let i = 0; i < createdProducts.length; i++) {
        const numWarehouses = Math.floor(Math.random() * 4) + 1 // 1-4 warehouses per product
        const selectedWarehouses = createdWarehouses
          .sort(() => Math.random() - 0.5)
          .slice(0, numWarehouses)
        
        selectedWarehouses.forEach(warehouse => {
          inventoryEntries.push({
            productId: createdProducts[i].id,
            warehouseId: warehouse.id,
              quantity: Math.floor(Math.random() * 200) + 10, // Random quantity 10-209
          })
        })
      }

      await Promise.all(
        inventoryEntries.map((entry) => {
          const date = getRandomDateInLast3Months()
          return tx.inventory.create({
            data: {
              productId: entry.productId,
              warehouseId: entry.warehouseId,
              quantity: entry.quantity,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      // 8. Create 150 Product Batches
      const batchProducts = createdProducts.filter((_, i) => i % 2 === 0) // Every 2nd product has batches
      const createdBatches = await Promise.all(
        Array.from({ length: 150 }, (_, i) => {
          const product = batchProducts[i % batchProducts.length]
          const warehouse = createdWarehouses[i % createdWarehouses.length]
          const date = getRandomDateInLast3Months()
          
          // Some batches expire soon (within 30 days from now), others later
          const now = new Date()
          const expiryDate = i % 4 === 0 
            ? new Date(now.getTime() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000) // 1-30 days from now
            : new Date(now.getTime() + (Math.random() * 180 + 30) * 24 * 60 * 60 * 1000) // 30-210 days from now
          
          return tx.productBatch.create({
            data: {
              productId: product.id,
              warehouseId: warehouse.id,
              batchNumber: `BATCH-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
              expiryDate: expiryDate,
              quantity: Math.floor(Math.random() * 100) + 10,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      // 9. Create 100 Expiry Alerts (for batches expiring soon)
      // Filter batches that expire within 30 days from now
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiringBatches = createdBatches.filter((batch) => 
        batch.expiryDate && batch.expiryDate <= thirtyDaysFromNow
      )
      
      // Create alerts for expiring batches, and add more from other batches if needed to reach 100
      let batchesForAlerts = [...expiringBatches]
      if (batchesForAlerts.length < 100) {
        const remainingBatches = createdBatches.filter(b => !expiringBatches.includes(b))
        batchesForAlerts = [...batchesForAlerts, ...remainingBatches.slice(0, 100 - batchesForAlerts.length)]
      }
      batchesForAlerts = batchesForAlerts.slice(0, 100) // Ensure exactly 100
      
      await Promise.all(
        batchesForAlerts.map((batch) => {
          const date = getRandomDateInLast3Months()
          const expiryDate = batch.expiryDate || new Date()
          return tx.expiryAlert.create({
            data: {
              batchId: batch.id,
              message: `Batch ${batch.batchNumber} is expiring soon (${expiryDate.toLocaleDateString()})`,
              status: Math.random() > 0.5 ? AlertStatus.NEW : AlertStatus.READ,
              createdAt: date,
            },
          })
        })
      )

      // 10. Create 100 Alerts (for low stock items)
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const product = createdProducts[i % createdProducts.length]
          const warehouse = createdWarehouses[i % createdWarehouses.length]
          const date = getRandomDateInLast3Months()
          
          return tx.alert.create({
            data: {
              productId: product.id,
              message: `Low stock alert: ${product.name} in ${warehouse.name}`,
              status: Math.random() > 0.3 ? AlertStatus.NEW : AlertStatus.READ,
              createdAt: date,
            },
          })
        })
      )

      // 11. Create 150 Purchase Orders
      const poStatuses = [PurchaseOrderStatus.PENDING, PurchaseOrderStatus.SENT, PurchaseOrderStatus.RECEIVED]
      await Promise.all(
        Array.from({ length: 150 }, (_, i) => {
          const product = createdProducts[i % createdProducts.length]
          const supplier = createdSuppliers[i % createdSuppliers.length]
          const date = getRandomDateInLast3Months()
          const status = poStatuses[i % poStatuses.length]
          
          return tx.purchaseOrder.create({
            data: {
              supplierId: supplier.id,
              productId: product.id,
              quantity: Math.floor(Math.random() * 100) + 20, // Random between 20-119
              status: status,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      // 12. Create 300 Transactions (mix of all types including RETURN and USAGE)
      const transactionTypes = [
        TransactionType.IN, 
        TransactionType.OUT, 
        TransactionType.TRANSFER,
        TransactionType.RETURN,
        TransactionType.USAGE
      ]
      const reasons = [
        'Stock adjustment',
        'Received from supplier',
        'Customer return',
        'Defective item return',
        'Field usage',
        'Maintenance usage',
        'Transfer for distribution',
        'Stock replenishment',
        'Emergency restock',
        'Regular restock'
      ]
      const departments = [
        'Field Operations',
        'Maintenance',
        'Quality Control',
        'Warehouse',
        'Distribution',
        'Logistics',
        'Operations',
        'Procurement'
      ]
      
      await Promise.all(
        Array.from({ length: 300 }, (_, i) => {
          const product = createdProducts[i % createdProducts.length]
          const type = transactionTypes[i % transactionTypes.length]
          const date = getRandomDateInLast3Months()
          const reason = reasons[i % reasons.length]
          const department = (type === TransactionType.USAGE || type === TransactionType.RETURN) 
            ? departments[i % departments.length] 
            : undefined
          
          // Assign user - alternate between admin and user
          const assignedUser = i % 2 === 0 ? admin : user
          
          let sourceWarehouseId: string | undefined
          let destinationWarehouseId: string | undefined
          
          if (type === TransactionType.IN || type === TransactionType.RETURN) {
            destinationWarehouseId = createdWarehouses[i % createdWarehouses.length].id
          } else if (type === TransactionType.OUT || type === TransactionType.USAGE) {
            sourceWarehouseId = createdWarehouses[i % createdWarehouses.length].id
          } else {
            // TRANSFER
            const warehouses = createdWarehouses.sort(() => Math.random() - 0.5).slice(0, 2)
            sourceWarehouseId = warehouses[0].id
            destinationWarehouseId = warehouses[1].id
          }
          
          return tx.transaction.create({
            data: {
              productId: product.id,
              sourceWarehouseId,
              destinationWarehouseId,
              quantity: Math.floor(Math.random() * 100) + 1, // Random 1-100
              type: type,
              userId: assignedUser.id,
              reason: reason,
              department: department || null,
              timestamp: date,
              createdAt: date,
            },
          })
        })
      )
    })

    // Get counts
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

    return NextResponse.json(
      {
        message: 'Database seeded successfully with enhanced data!',
        data: counts,
        summary: {
          users: '2 default users',
          warehouses: '50 warehouses',
          suppliers: '50 suppliers',
          products: '100 products',
          inventory: `~300 inventory entries (100 products × 1-4 warehouses)`,
          batches: '150 product batches',
          purchaseOrders: '150 purchase orders',
          transactions: '300 transactions (all types including RETURN and USAGE)',
          alerts: '100 low stock alerts',
          expiryAlerts: '100 expiry alerts',
        },
        dateRange: 'Last 3 months',
        defaultCredentials: {
          admin: { email: 'admin@example.com', password: 'admin123' },
          user: { email: 'user@example.com', password: 'user123' },
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check seed status
export async function GET() {
  try {
    const counts = {
      users: await prisma.user.count(),
      products: await prisma.product.count(),
      warehouses: await prisma.warehouse.count(),
      suppliers: await prisma.supplier.count(),
      inventory: await prisma.inventory.count(),
      transactions: await prisma.transaction.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      alerts: await prisma.alert.count(),
      batches: await prisma.productBatch.count(),
    }

    const isSeeded = counts.products > 0

    return NextResponse.json({
      seeded: isSeeded,
      counts,
      message: isSeeded
        ? 'Database already contains data'
        : 'Database is empty, ready for seeding',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check seed status', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clear all data (use with caution!)
export async function DELETE() {
  try {
    // Delete in order to respect foreign key constraints
    await prisma.$transaction(async (tx) => {
      await tx.expiryAlert.deleteMany()
      await tx.alert.deleteMany()
      await tx.transaction.deleteMany()
      await tx.productBatch.deleteMany()
      await tx.inventory.deleteMany()
      await tx.productSupplier.deleteMany()
      await tx.productSetting.deleteMany()
      await tx.purchaseOrder.deleteMany()
      await tx.product.deleteMany()
      await tx.warehouse.deleteMany()
      await tx.supplier.deleteMany()
      // Keep users - you might want to remove this line if you want to delete users too
      // await tx.user.deleteMany()
    })

    return NextResponse.json({
      message: 'Database cleared successfully',
      note: 'Users were preserved. To delete users, uncomment the line in the code.',
    })
  } catch (error: any) {
    console.error('Clear database error:', error)
    return NextResponse.json(
      { error: 'Failed to clear database', details: error.message },
      { status: 500 }
    )
  }
}

