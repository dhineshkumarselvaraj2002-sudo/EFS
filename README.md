# Inventory Management System (MVP)

A production-ready Inventory Management System built with Next.js 15, PostgreSQL, Prisma, TanStack Query, Zustand, and shadcn/ui.

## 🚀 Features

- **Real-Time Inventory Tracking**: Add/edit products, warehouses, and track stock levels across multiple locations
- **Automated Stock Alerts**: Automatic alerts when inventory falls below minimum stock levels
- **Batch & Expiry Tracking**: Track product batches with expiry dates using FEFO (First Expire First Out) logic
- **Supplier Management**: Manage suppliers and associate them with products
- **Purchase Orders**: Create and manage purchase orders, automatically update inventory on receipt
- **Transaction History**: Complete audit trail of all inventory movements
- **Dark/Light Theme**: Beautiful UI with theme toggle support
- **Authentication**: Secure JWT-based authentication with NextAuth

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Data Fetching**: TanStack Query (React Query)
- **State Management**: Zustand
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Authentication**: NextAuth.js (JWT)
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn or pnpm

## 🔧 Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd EFS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate a random secret (you can use `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 👤 Default User

After setting up the database, you can register a new user at `/register` or create one manually using Prisma Studio:

```bash
npx prisma studio
```

Or create a user via the API:
```bash
POST /api/register
{
  "name": "Admin",
  "email": "admin@example.com",
  "password": "password123",
  "role": "ADMIN"
}
```

## 📁 Project Structure

```
app/
├── (auth)/              # Authentication pages
│   ├── login/
│   └── register/
├── (dashboard)/         # Protected dashboard pages
│   ├── layout.tsx
│   ├── page.tsx         # Dashboard overview
│   ├── products/
│   ├── warehouses/
│   ├── inventory/
│   ├── transactions/
│   ├── suppliers/
│   ├── purchase-orders/
│   └── alerts/
├── api/                  # API routes
│   ├── auth/
│   ├── products/
│   ├── warehouses/
│   ├── inventory/
│   ├── transactions/
│   ├── suppliers/
│   ├── purchase-orders/
│   ├── alerts/
│   └── batches/
├── components/           # React components
├── lib/                  # Utilities and helpers
│   ├── prisma.ts
│   ├── auth.ts
│   └── hooks/
├── prisma/
│   └── schema.prisma    # Database schema
└── providers/           # Context providers
```

## 🔑 Key Features Explained

### Stock Alert Automation
- When inventory quantity falls below the minimum stock level, an alert is automatically created
- Alerts are shown in the dashboard and alerts page
- Can be marked as read when addressed

### Batch & Expiry Tracking
- When adding stock (Stock In), you can optionally add batch number and expiry date
- The system uses FEFO (First Expire First Out) logic for stock-out operations
- Expiry alerts are automatically generated for batches expiring within 30 days
- Use the "Check Expiry Alerts" button to scan for expiring batches

### Purchase Orders
- Create purchase orders linked to suppliers and products
- When a purchase order is marked as "Received", inventory is automatically updated
- Specify which warehouse to receive the order into

### Inventory Transfer
- Transfer stock between warehouses
- All transfers are logged in the transactions table
- Both source and destination warehouses are updated atomically

## 🗄️ Database Schema

The system includes 12 main entities:

1. **Products**: Product catalog (name, SKU, category, unit)
2. **Warehouses**: Warehouse locations
3. **Inventory**: Stock levels per product per warehouse
4. **Transactions**: All inventory movements (IN, OUT, TRANSFER)
5. **Product Settings**: Minimum stock levels per product
6. **Alerts**: Stock alerts when below minimum levels
7. **Product Batches**: Batch tracking with expiry dates
8. **Expiry Alerts**: Alerts for batches expiring soon
9. **Suppliers**: Supplier information
10. **Product Suppliers**: Product-supplier associations with pricing
11. **Purchase Orders**: Purchase order management
12. **Users**: User accounts with authentication

## 🔒 Authentication

- JWT-based authentication using NextAuth
- Password hashing with bcrypt
- Protected routes using middleware
- Role-based access control (ADMIN/USER)

## 🎨 UI/UX Features

- Responsive design with TailwindCSS
- Dark/Light theme toggle
- Toast notifications for actions
- Form validation with Zod
- Loading states and error handling
- Accessible components from shadcn/ui

## 📝 API Routes

All API routes are protected and require authentication:

- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

Similar CRUD operations available for:
- Warehouses (`/api/warehouses`)
- Suppliers (`/api/suppliers`)
- Purchase Orders (`/api/purchase-orders`)
- Alerts (`/api/alerts`)
- Inventory (`/api/inventory`)
- Transactions (`/api/transactions`)

## 🚀 Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run migrations in production**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

For deployment platforms like Vercel, ensure:
- Database URL is set in environment variables
- NextAuth secret is configured
- Prisma migrations run automatically or manually

## 🔄 Running Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 📊 Future Enhancements

- Email notifications for alerts
- Advanced reporting and analytics
- Barcode scanning support
- Multi-language support
- Export/Import functionality
- Advanced search and filtering

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📞 Support

For support, please open an issue in the repository.

---

Built with ❤️ using Next.js and modern web technologies.

