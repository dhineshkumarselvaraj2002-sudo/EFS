import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth'
import { TransactionType, PurchaseOrderStatus, AlertStatus } from '@prisma/client'

// Helper to get date N days ago
function getDateDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(Math.floor(Math.random() * 24))
  date.setMinutes(Math.floor(Math.random() * 60))
  return date
}

// Helper to get date N months ago with random day
function getDateMonthsAgo(months: number): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  date.setDate(Math.floor(Math.random() * 28) + 1) // Random day in month
  date.setHours(Math.floor(Math.random() * 24))
  date.setMinutes(Math.floor(Math.random() * 60))
  return date
}

// Generate date spread across past 3 months (more in recent months)
function getRealisticDate(index: number, total: number): Date {
  const now = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  // 50% in last month, 30% in second month, 20% in third month
  const random = Math.random()
  if (random < 0.5) {
    // Last month
    const daysAgo = Math.floor(Math.random() * 30)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    return date
  } else if (random < 0.8) {
    // Second month
    const daysAgo = 30 + Math.floor(Math.random() * 30)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    return date
  } else {
    // Third month
    const daysAgo = 60 + Math.floor(Math.random() * 30)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    return date
  }
}

async function seed() {
  try {
    console.log('🌱 Starting database seed with varied data...')

    // Check if data already exists
    const existingProducts = await prisma.product.count()
    if (existingProducts > 0) {
      console.log('⚠️  Database already contains data. Clearing first...')
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
        await tx.user.deleteMany()
      })
      console.log('✅ Database cleared')
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Users
      const adminPassword = await hashPassword('admin123')
      const userPassword = await hashPassword('user123')
      const managerPassword = await hashPassword('manager123')

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

      const manager = await tx.user.upsert({
        where: { email: 'manager@example.com' },
        update: {
          name: 'Warehouse Manager',
          password: managerPassword,
          role: 'USER',
        },
        create: {
          name: 'Warehouse Manager',
          email: 'manager@example.com',
          password: managerPassword,
          role: 'USER',
        },
      })

      const users = [admin, user, manager]
      console.log('✅ Created 3 users')

      // 2. Create Warehouses (40 warehouses with varied locations)
      const warehouseData = [
        { name: 'Central Distribution Hub', location: 'Chicago, IL' },
        { name: 'West Coast Terminal', location: 'Los Angeles, CA' },
        { name: 'East Coast Facility', location: 'New York, NY' },
        { name: 'Southern Logistics Center', location: 'Atlanta, GA' },
        { name: 'Pacific Northwest Depot', location: 'Seattle, WA' },
        { name: 'Midwest Storage Complex', location: 'Detroit, MI' },
        { name: 'Gulf Coast Warehouse', location: 'Houston, TX' },
        { name: 'Rocky Mountain Hub', location: 'Denver, CO' },
        { name: 'Southwest Distribution', location: 'Phoenix, AZ' },
        { name: 'Northeast Regional Center', location: 'Boston, MA' },
        { name: 'Ohio Valley Warehouse', location: 'Cincinnati, OH' },
        { name: 'Carolina Distribution', location: 'Charlotte, NC' },
        { name: 'Florida Logistics Hub', location: 'Miami, FL' },
        { name: 'Great Lakes Terminal', location: 'Cleveland, OH' },
        { name: 'Mississippi Delta Depot', location: 'Memphis, TN' },
        { name: 'Dallas-Fort Worth Hub', location: 'Dallas, TX' },
        { name: 'San Francisco Bay Center', location: 'Oakland, CA' },
        { name: 'Philadelphia Distribution', location: 'Philadelphia, PA' },
        { name: 'Twin Cities Warehouse', location: 'Minneapolis, MN' },
        { name: 'Portland Metro Hub', location: 'Portland, OR' },
        { name: 'Baltimore Shipping Center', location: 'Baltimore, MD' },
        { name: 'Milwaukee Distribution', location: 'Milwaukee, WI' },
        { name: 'Kansas City Hub', location: 'Kansas City, MO' },
        { name: 'Las Vegas Logistics', location: 'Las Vegas, NV' },
        { name: 'Raleigh-Durham Center', location: 'Raleigh, NC' },
        { name: 'Nashville Warehouse', location: 'Nashville, TN' },
        { name: 'Virginia Beach Depot', location: 'Virginia Beach, VA' },
        { name: 'Sacramento Distribution', location: 'Sacramento, CA' },
        { name: 'Tucson Storage Facility', location: 'Tucson, AZ' },
        { name: 'Fresno Logistics Center', location: 'Fresno, CA' },
        { name: 'Mesa Warehouse', location: 'Mesa, AZ' },
        { name: 'Omaha Distribution Hub', location: 'Omaha, NE' },
        { name: 'Tulsa Storage Center', location: 'Tulsa, OK' },
        { name: 'Arlington Warehouse', location: 'Arlington, TX' },
        { name: 'Tampa Distribution', location: 'Tampa, FL' },
        { name: 'New Orleans Hub', location: 'New Orleans, LA' },
        { name: 'Long Beach Terminal', location: 'Long Beach, CA' },
        { name: 'Albuquerque Center', location: 'Albuquerque, NM' },
        { name: 'El Paso Warehouse', location: 'El Paso, TX' },
        { name: 'Louisville Depot', location: 'Louisville, KY' },
      ]

      const createdWarehouses = await Promise.all(
        warehouseData.map((warehouse, i) => {
          const date = getRealisticDate(i, warehouseData.length)
          return tx.warehouse.create({
            data: {
              name: warehouse.name,
              location: warehouse.location,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      console.log(`✅ Created ${createdWarehouses.length} warehouses`)

      // 3. Create Suppliers (45 suppliers with varied names)
      const supplierData = [
        { name: 'Global Industrial Supplies', contact: 'Michael Chen', domain: 'globalsupply.com' },
        { name: 'TechParts Distribution', contact: 'Sarah Johnson', domain: 'techparts.com' },
        { name: 'Premium Components Inc', contact: 'David Williams', domain: 'premiumcomp.com' },
        { name: 'Elite Materials Co', contact: 'Emily Martinez', domain: 'elitematerials.com' },
        { name: 'Metro Supply Chain', contact: 'James Brown', domain: 'metrosupply.com' },
        { name: 'Apex Distributors LLC', contact: 'Jennifer Davis', domain: 'apexdist.com' },
        { name: 'Continental Goods', contact: 'Robert Miller', domain: 'continental.com' },
        { name: 'Summit Trading Co', contact: 'Linda Wilson', domain: 'summittrading.com' },
        { name: 'Pacific Materials', contact: 'Christopher Moore', domain: 'pacificmaterials.com' },
        { name: 'Atlantic Suppliers', contact: 'Patricia Taylor', domain: 'atlanticsupp.com' },
        { name: 'United Wholesale', contact: 'Daniel Anderson', domain: 'unitedwholesale.com' },
        { name: 'Prime Sourcing Group', contact: 'Nancy Thomas', domain: 'primesourcing.com' },
        { name: 'Heritage Distributors', contact: 'Matthew Jackson', domain: 'heritagedist.com' },
        { name: 'Universal Supply Network', contact: 'Karen White', domain: 'universalsupply.com' },
        { name: 'Meridian Trading', contact: 'Jason Harris', domain: 'meridian.com' },
        { name: 'Nexus Commerce Group', contact: 'Betty Martin', domain: 'nexuscommerce.com' },
        { name: 'Fidelity Materials', contact: 'Kevin Thompson', domain: 'fidelitymaterials.com' },
        { name: 'Valley Distribution', contact: 'Dorothy Garcia', domain: 'valleydist.com' },
        { name: 'Coastal Logistics', contact: 'Brian Martinez', domain: 'coastallog.com' },
        { name: 'Plains Trading Co', contact: 'Lisa Robinson', domain: 'plainstrading.com' },
        { name: 'Mountain Supply Chain', contact: 'Anthony Clark', domain: 'mountainsupply.com' },
        { name: 'River Valley Distributors', contact: 'Michelle Rodriguez', domain: 'rivervalley.com' },
        { name: 'Horizon Commerce', contact: 'Steven Lewis', domain: 'horizoncommerce.com' },
        { name: 'Stellar Suppliers', contact: 'Donna Lee', domain: 'stellarsupp.com' },
        { name: 'Cascade Materials', contact: 'Edward Walker', domain: 'cascadematerials.com' },
        { name: 'Phoenix Trading', contact: 'Sharon Hall', domain: 'phoenixtrading.com' },
        { name: 'Eagle Distribution', contact: 'Ronald Allen', domain: 'eagledist.com' },
        { name: 'Liberty Supply Co', contact: 'Carol Young', domain: 'libertysupply.com' },
        { name: 'Crown Distributors', contact: 'Thomas Hernandez', domain: 'crowndist.com' },
        { name: 'Royal Materials', contact: 'Deborah King', domain: 'royalmaterials.com' },
        { name: 'Imperial Trading', contact: 'Ryan Wright', domain: 'imperialtrading.com' },
        { name: 'Diamond Supply Chain', contact: 'Ruth Lopez', domain: 'diamondsupply.com' },
        { name: 'Platinum Distributors', contact: 'Jacob Hill', domain: 'platinumdist.com' },
        { name: 'Emerald Commerce', contact: 'Jessica Scott', domain: 'emeraldcommerce.com' },
        { name: 'Sapphire Suppliers', contact: 'Gary Green', domain: 'sapphiresupp.com' },
        { name: 'Ruby Trading', contact: 'Shirley Adams', domain: 'rubytrading.com' },
        { name: 'Crystal Distribution', contact: 'Nicholas Baker', domain: 'crystaldist.com' },
        { name: 'Pearl Materials', contact: 'Anna Gonzalez', domain: 'pearlmaterials.com' },
        { name: 'Jade Supply Co', contact: 'Eric Nelson', domain: 'jadesupply.com' },
        { name: 'Opal Trading', contact: 'Margaret Carter', domain: 'opaltrading.com' },
        { name: 'Topaz Distributors', contact: 'Frank Mitchell', domain: 'topazdist.com' },
        { name: 'Amethyst Supply', contact: 'Amy Perez', domain: 'amethystsupply.com' },
        { name: 'Garnet Commerce', contact: 'Raymond Roberts', domain: 'garnetcommerce.com' },
        { name: 'Citrine Trading', contact: 'Angela Turner', domain: 'citrinetrading.com' },
        { name: 'Quartz Materials', contact: 'Peter Phillips', domain: 'quartzmaterials.com' },
      ]

      const createdSuppliers = await Promise.all(
        supplierData.map((supplier, i) => {
          const date = getRealisticDate(i, supplierData.length)
          const locationIndex = i % warehouseData.length
          const location = warehouseData[locationIndex].location
          
          return tx.supplier.create({
            data: {
              name: supplier.name,
              contactPerson: supplier.contact,
              phone: `+1-${555 + Math.floor(Math.random() * 900)}-${String(1000 + i).padStart(4, '0')}`,
              email: `${supplier.contact.toLowerCase().replace(' ', '.')}@${supplier.domain}`,
              address: `${100 + i} Commerce Blvd, ${location} ${10000 + i}`,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      console.log(`✅ Created ${createdSuppliers.length} suppliers`)

      // 4. Create Products (120 products with varied categories)
      const productCategories = [
        { category: 'Electronics', products: [
          'Smartphone', 'Tablet', 'Laptop', 'Desktop Computer', 'Monitor', 'Keyboard', 'Mouse',
          'Webcam', 'Microphone', 'Headphones', 'Speaker', 'USB Drive', 'External SSD',
          'Router', 'Network Switch', 'Ethernet Cable', 'HDMI Cable', 'Charging Cable',
          'Power Bank', 'Wireless Charger', 'Smart Watch', 'Fitness Tracker'
        ]},
        { category: 'Furniture', products: [
          'Office Desk', 'Standing Desk', 'Desk Chair', 'Conference Table', 'File Cabinet',
          'Bookshelf', 'Storage Cabinet', 'Desk Organizer', 'Monitor Stand', 'Laptop Stand',
          'Cable Manager', 'Desk Mat', 'Waste Basket', 'Recycling Bin'
        ]},
        { category: 'Office Supplies', products: [
          'Printer Paper', 'Notebooks', 'Stapler', 'Paper Clips', 'Binder', 'Folder',
          'Envelopes', 'Sticky Notes', 'Highlighters', 'Markers', 'Pens', 'Pencils',
          'Scissors', 'Tape Dispenser', 'Calculator', 'Whiteboard', 'Dry Erase Markers',
          'Eraser', 'Hole Punch', 'Label Maker', 'Clipboard'
        ]},
        { category: 'Printing & Imaging', products: [
          'Printer Ink Cartridge', 'Toner Cartridge', 'Photo Paper', 'Lamination Sheets',
          'Binding Covers', 'Document Scanner', 'Photo Scanner', 'Label Printer'
        ]},
        { category: 'Tools & Equipment', products: [
          'Screwdriver Set', 'Wrench Set', 'Power Drill', 'Measuring Tape', 'Level',
          'Hammer', 'Pliers', 'Utility Knife', 'Toolbox', 'Safety Glasses'
        ]},
        { category: 'Safety & PPE', products: [
          'Safety Helmet', 'Safety Vest', 'Work Gloves', 'Respirator Mask', 'Ear Protection',
          'Safety Boots', 'First Aid Kit', 'Fire Extinguisher', 'Emergency Light'
        ]},
        { category: 'Cleaning Supplies', products: [
          'All-Purpose Cleaner', 'Disinfectant Wipes', 'Paper Towels', 'Trash Bags',
          'Broom', 'Mop', 'Vacuum Cleaner', 'Microfiber Cloths', 'Glass Cleaner'
        ]},
        { category: 'Maintenance', products: [
          'Light Bulbs', 'Batteries', 'Extension Cord', 'Power Strip', 'Surge Protector',
          'Air Filter', 'HVAC Filter', 'Replacement Parts', 'Lubricant', 'Cleaning Solution'
        ]},
      ]

      const allProducts: Array<{name: string, category: string, unit: string}> = []
      productCategories.forEach((cat) => {
        cat.products.forEach((productName) => {
          let unit = 'unit'
          if (productName.includes('Paper') || productName.includes('Notebooks') || productName.includes('Envelopes')) {
            unit = 'pack'
          } else if (productName.includes('Cable') || productName.includes('Clips') || productName.includes('Pens') || productName.includes('Markers')) {
            unit = 'pack'
          } else if (productName.includes('Cartridge') || productName.includes('Toner')) {
            unit = 'cartridge'
          } else if (productName.includes('Set')) {
            unit = 'set'
          } else if (productName.includes('Paper') || productName.includes('Sheets')) {
            unit = 'ream'
          }
          allProducts.push({ name: productName, category: cat.category, unit })
        })
      })

      // Add more variants to reach 120 products
      while (allProducts.length < 120) {
        const baseProduct = allProducts[Math.floor(Math.random() * allProducts.length)]
        const variant = Math.floor(allProducts.length / 50) + 1
        allProducts.push({
          name: `${baseProduct.name} (Model ${variant})`,
          category: baseProduct.category,
          unit: baseProduct.unit
        })
      }

      const createdProducts = await Promise.all(
        allProducts.slice(0, 120).map((product, i) => {
          const date = getRealisticDate(i, 120)
          const skuPrefix = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD'
          
          return tx.product.create({
            data: {
              name: product.name,
              sku: `${skuPrefix}-${String(i + 1).padStart(4, '0')}`,
              category: product.category,
              unit: product.unit,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      console.log(`✅ Created ${createdProducts.length} products`)

      // 5. Create Product Settings
      await Promise.all(
        createdProducts.map((product, index) => {
          const date = getRealisticDate(index, createdProducts.length)
          // Vary min stock levels based on product category
          const categoryFactor = product.category === 'Electronics' ? 3 : product.category === 'Furniture' ? 2 : 1
          const baseMinStock = 10 * categoryFactor
          const baseSafetyStock = 5 * categoryFactor
          
          return tx.productSetting.create({
            data: {
              productId: product.id,
              minStockLevel: baseMinStock + Math.floor(Math.random() * 20),
              safetyStock: baseSafetyStock + Math.floor(Math.random() * 10),
              leadTimeDays: Math.floor(Math.random() * 14) + 3,
              createdAt: date,
              updatedAt: date,
            },
          })
        })
      )

      console.log('✅ Created product settings')

      // 6. Create Product-Supplier relationships
      const productSupplierEntries: Array<{ productId: string; supplierId: string; price: number }> = []
      createdProducts.forEach((product, i) => {
        const numSuppliers = Math.floor(Math.random() * 3) + 1
        const selectedSuppliers = createdSuppliers
          .sort(() => Math.random() - 0.5)
          .slice(0, numSuppliers)
        
        selectedSuppliers.forEach((supplier) => {
          // Price varies by category
          let basePrice = 10
          if (product.category === 'Electronics') basePrice = 50 + Math.random() * 950
          else if (product.category === 'Furniture') basePrice = 100 + Math.random() * 900
          else if (product.category === 'Tools & Equipment') basePrice = 20 + Math.random() * 480
          else basePrice = 5 + Math.random() * 95
          
          productSupplierEntries.push({
            productId: product.id,
            supplierId: supplier.id,
            price: Math.round(basePrice * 100) / 100,
          })
        })
      })

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

      console.log('✅ Created product-supplier relationships')

      // 7. Create Inventory
      const inventoryEntries: Array<{ productId: string; warehouseId: string; quantity: number }> = []
      createdProducts.forEach((product, i) => {
        const numWarehouses = Math.floor(Math.random() * 5) + 1
        const selectedWarehouses = createdWarehouses
          .sort(() => Math.random() - 0.5)
          .slice(0, numWarehouses)
        
        selectedWarehouses.forEach(warehouse => {
          // Quantity varies by category
          let quantity = 10
          if (product.category === 'Electronics') quantity = 5 + Math.floor(Math.random() * 45)
          else if (product.category === 'Furniture') quantity = 2 + Math.floor(Math.random() * 18)
          else quantity = 20 + Math.floor(Math.random() * 180)
          
          inventoryEntries.push({
            productId: product.id,
            warehouseId: warehouse.id,
            quantity,
          })
        })
      })

      await Promise.all(
        inventoryEntries.map((entry, i) => {
          const date = getRealisticDate(i, inventoryEntries.length)
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

      console.log(`✅ Created ${inventoryEntries.length} inventory entries`)

      // 8. Create Product Batches (200 batches with realistic expiry dates)
      const batchProducts = createdProducts.filter((_, i) => i % 2 === 0 || productCategories.some(cat => createdProducts[i].category === cat.category))
      const createdBatches = await Promise.all(
        Array.from({ length: 200 }, (_, i) => {
          const product = batchProducts[i % batchProducts.length]
          const warehouse = createdWarehouses[i % createdWarehouses.length]
          const date = getRealisticDate(i, 200)
          
          // 30% expire soon (1-30 days), 40% expire mid-term (31-90 days), 30% expire later (91-365 days)
          const now = new Date()
          let expiryDate: Date | null = null
          const random = Math.random()
          
          if (random < 0.3) {
            expiryDate = new Date(now.getTime() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000)
          } else if (random < 0.7) {
            expiryDate = new Date(now.getTime() + (Math.random() * 60 + 30) * 24 * 60 * 60 * 1000)
          } else {
            expiryDate = new Date(now.getTime() + (Math.random() * 274 + 91) * 24 * 60 * 60 * 1000)
          }
          
          const year = new Date().getFullYear()
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

      // 9. Create Expiry Alerts
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiringBatches = createdBatches.filter((batch) => 
        batch.expiryDate && batch.expiryDate <= thirtyDaysFromNow
      )
      
      await Promise.all(
        expiringBatches.map((batch, i) => {
          const date = getRealisticDate(i, expiringBatches.length)
          const expiryDate = batch.expiryDate || new Date()
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

      console.log(`✅ Created ${expiringBatches.length} expiry alerts`)

      // 10. Create Low Stock Alerts
      await Promise.all(
        Array.from({ length: 120 }, (_, i) => {
          const product = createdProducts[i % createdProducts.length]
          const warehouse = createdWarehouses[i % createdWarehouses.length]
          const inventory = inventoryEntries.find(
            inv => inv.productId === product.id && inv.warehouseId === warehouse.id
          )
          
          if (!inventory || inventory.quantity > 15) return null
          
          const date = getRealisticDate(i, 120)
          
          return tx.alert.create({
            data: {
              productId: product.id,
              message: `Low stock: ${inventory.quantity} units remaining in ${warehouse.name}`,
              status: Math.random() > 0.3 ? AlertStatus.NEW : AlertStatus.READ,
              createdAt: date,
            },
          })
        }).filter(Boolean)
      )

      console.log('✅ Created low stock alerts')

      // 11. Create Purchase Orders
      const poStatuses = [PurchaseOrderStatus.PENDING, PurchaseOrderStatus.SENT, PurchaseOrderStatus.RECEIVED]
      await Promise.all(
        Array.from({ length: 180 }, (_, i) => {
          const product = createdProducts[i % createdProducts.length]
          const supplier = createdSuppliers[i % createdSuppliers.length]
          const date = getRealisticDate(i, 180)
          const statusIndex = Math.floor(Math.random() * 3)
          const status = poStatuses[statusIndex]
          
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

      console.log('✅ Created 180 purchase orders')

      // 12. Create Transactions (400 transactions spread across 3 months)
      const transactionTypes = [
        TransactionType.IN, 
        TransactionType.OUT, 
        TransactionType.TRANSFER,
        TransactionType.RETURN,
        TransactionType.USAGE
      ]
      const reasons = [
        'Stock replenishment', 'Received from supplier', 'Customer order fulfillment',
        'Inter-warehouse transfer', 'Defective item return', 'Customer return',
        'Field deployment', 'Maintenance usage', 'Emergency restock', 'Cycle count adjustment',
        'Damaged goods return', 'Quality control testing', 'Demo equipment', 'Sample distribution'
      ]
      const departments = [
        'Field Operations', 'Maintenance', 'Quality Control', 'Warehouse',
        'Distribution', 'Logistics', 'Operations', 'Procurement', 'Sales', 'Customer Service'
      ]
      
      await Promise.all(
        Array.from({ length: 400 }, (_, i) => {
          const product = createdProducts[i % createdProducts.length]
          const type = transactionTypes[i % transactionTypes.length]
          const date = getRealisticDate(i, 400)
          const reason = reasons[i % reasons.length]
          const department = (type === TransactionType.USAGE || type === TransactionType.RETURN) 
            ? departments[i % departments.length] 
            : undefined
          
          const assignedUser = users[i % users.length]
          
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
              quantity: Math.floor(Math.random() * 100) + 1,
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

      console.log('✅ Created 400 transactions')
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

    console.log('\n✅ Database seeded successfully with varied data!')
    console.log('\n📊 Seeded data counts:')
    console.log(`  Users: ${counts.users}`)
    console.log(`  Warehouses: ${counts.warehouses}`)
    console.log(`  Suppliers: ${counts.suppliers}`)
    console.log(`  Products: ${counts.products}`)
    console.log(`  Product Settings: ${counts.productSettings}`)
    console.log(`  Product-Supplier Relations: ${counts.productSuppliers}`)
    console.log(`  Inventory Entries: ${counts.inventory}`)
    console.log(`  Product Batches: ${counts.batches}`)
    console.log(`  Expiry Alerts: ${counts.expiryAlerts}`)
    console.log(`  Low Stock Alerts: ${counts.alerts}`)
    console.log(`  Purchase Orders: ${counts.purchaseOrders}`)
    console.log(`  Transactions: ${counts.transactions}`)
    console.log('\n🔑 Default login credentials:')
    console.log(`  Admin: admin@example.com / admin123`)
    console.log(`  User: user@example.com / user123`)
    console.log(`  Manager: manager@example.com / manager123`)
    console.log('\n📅 Date Distribution:')
    console.log('  - 50% of records in the last month')
    console.log('  - 30% of records in the second month')
    console.log('  - 20% of records in the third month')
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

