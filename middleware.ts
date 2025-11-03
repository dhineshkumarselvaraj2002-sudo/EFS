import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // You can add additional middleware logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    // Protect all dashboard routes
    '/dashboard/:path*',
    // Protect API routes (except auth and register which are handled separately)
    '/api/products/:path*',
    '/api/inventory/:path*',
    '/api/warehouses/:path*',
    '/api/suppliers/:path*',
    '/api/transactions/:path*',
    '/api/purchase-orders/:path*',
    '/api/alerts/:path*',
    '/api/batches/:path*',
    '/api/expiry-alerts/:path*',
    '/api/dashboard/:path*',
  ],
}

