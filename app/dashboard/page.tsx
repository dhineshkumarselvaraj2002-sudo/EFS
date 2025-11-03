'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Warehouse, AlertTriangle, ShoppingCart, Calendar, Bell, LayoutDashboard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { DashboardSkeleton } from '@/components/skeleton-dashboard'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ChartLineMultiple } from '@/components/chart-line-multiple'
import { ChartPieInteractive } from '@/components/chart-pie-interactive'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { ChartBarLabelCustom } from '@/components/chart-bar-label-custom'
import { ChartRadialLabel } from '@/components/chart-radial-label'
import { ChartAlertsTrend } from '@/components/chart-alerts-trend'
import { ChartPurchaseOrdersStatus } from '@/components/chart-purchase-orders-status'
import { ChartSupplierPerformance } from '@/components/chart-supplier-performance'
import { ChartExpiringBatches } from '@/components/chart-expiring-batches'
import { ChartLowStockProducts } from '@/components/chart-low-stock-products'
import { LowStockAlert } from '@/components/low-stock-alert'
import { ChartProductsAnalytics } from '@/components/chart-products-analytics'
import { ChartWarehousesAnalytics } from '@/components/chart-warehouses-analytics'
import { ChartInventoryAnalytics } from '@/components/chart-inventory-analytics'
import { ChartTransactionsAnalytics } from '@/components/chart-transactions-analytics'
import { ChartSuppliersAnalytics } from '@/components/chart-suppliers-analytics'
import { ChartPurchaseOrdersAnalytics } from '@/components/chart-purchase-orders-analytics'
import { ChartAlertsAnalytics } from '@/components/chart-alerts-analytics'

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>
            Unable to fetch dashboard statistics. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <PageBreadcrumb />
      <div>
        <div className="flex items-center gap-3 mb-3">
          <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Dashboard Overview</h1>
        </div>
        <p className="text-base md:text-lg text-muted-foreground ml-9">Real-time inventory insights</p>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{stats?.totalWarehouses || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold text-destructive">
              {stats?.lowStockItems || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Batches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">
              {stats?.expiringBatches || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats?.totalAlerts || 0}</div>
              {(stats?.totalAlerts || 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats?.totalAlerts || 0} New
                </Badge>
              )}
            </div>
            {(stats?.newAlerts || 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {stats?.newAlerts} stock alerts
              </p>
            )}
            {(stats?.newExpiryAlerts || 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {stats?.newExpiryAlerts} expiry alerts
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction & Inventory Analytics */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        <ChartLineMultiple />
        <ChartPieInteractive />
        <ChartBarLabelCustom />
        <ChartRadialLabel />
      </div>

      <div className="grid gap-4 md:gap-6">
        <ChartAreaInteractive />
      </div>

      {/* Comprehensive Analytics Sections */}
      <div className="space-y-8 md:space-y-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Products Analytics</h2>
          <ChartProductsAnalytics />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Warehouses Analytics</h2>
          <ChartWarehousesAnalytics />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Inventory Analytics</h2>
          <ChartInventoryAnalytics />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Transactions Analytics</h2>
          <ChartTransactionsAnalytics />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Suppliers Analytics</h2>
          <ChartSuppliersAnalytics />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Purchase Orders Analytics</h2>
          <ChartPurchaseOrdersAnalytics />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Alerts Analytics</h2>
          <ChartAlertsAnalytics />
        </div>
      </div>
    </div>
  )
}
