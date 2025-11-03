'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Warehouse, AlertTriangle, ShoppingCart, Calendar, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
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
    <div className="space-y-6">
      <PageBreadcrumb />
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Real-time inventory insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWarehouses || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
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
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Batches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
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
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats?.totalAlerts || 0}</div>
              {(stats?.totalAlerts || 0) > 0 && (
                <Badge variant="destructive">
                  {stats?.totalAlerts || 0} New
                </Badge>
              )}
            </div>
            {(stats?.newAlerts || 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.newAlerts} stock alerts
              </p>
            )}
            {(stats?.newExpiryAlerts || 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.newExpiryAlerts} expiry alerts
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction & Inventory Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartLineMultiple />
        <ChartPieInteractive />
        <ChartBarLabelCustom />
        <ChartRadialLabel />
      </div>

      <div className="grid gap-4">
        <ChartAreaInteractive />
      </div>

      {/* Alerts & Monitoring Analytics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Alerts & Monitoring</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartAlertsTrend />
          <ChartExpiringBatches />
        </div>
        <div className="grid gap-4 mt-4">
          <ChartLowStockProducts />
        </div>
      </div>

      {/* Purchase Orders & Suppliers Analytics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Purchase Orders & Suppliers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartPurchaseOrdersStatus />
          <ChartSupplierPerformance />
        </div>
      </div>
    </div>
  )
}
