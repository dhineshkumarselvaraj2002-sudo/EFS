'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ArrowLeft, Package, AlertTriangle, ArrowRightLeft, TrendingUp, TrendingDown, Warehouse as WarehouseIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function WarehouseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string

  const { data: warehouse, isLoading, error } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/warehouses/${warehouseId}`)
      if (!res.ok) throw new Error('Failed to fetch warehouse')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-8 md:space-y-10">
        <PageBreadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-base text-muted-foreground">Loading warehouse details...</div>
        </div>
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <div className="space-y-8 md:space-y-10">
        <PageBreadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Warehouse not found</p>
            <Button onClick={() => router.push('/dashboard/warehouses')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Warehouses
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalItems = warehouse.inventory.length
  const totalQuantity = warehouse.inventory.reduce((sum: number, inv: any) => sum + inv.quantity, 0)
  const lowStockItems = warehouse.inventory.filter((inv: any) => {
    const minLevel = inv.product.productSettings?.minStockLevel || 0
    return inv.quantity < minLevel && minLevel > 0
  }).length
  const totalBatches = warehouse.batches.length
  const incomingTransfers = warehouse.destinationTransactions.filter((tx: any) => tx.type === 'TRANSFER').length
  const outgoingTransfers = warehouse.sourceTransactions.filter((tx: any) => tx.type === 'TRANSFER').length

  return (
    <div className="space-y-8 md:space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/warehouses')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <PageBreadcrumb />
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <WarehouseIcon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">{warehouse.name}</h1>
          <Badge variant={warehouse.status === 'Active' ? 'default' : 'secondary'}>
            {warehouse.status || 'Active'}
          </Badge>
          {warehouse.type && (
            <Badge variant="outline">{warehouse.type}</Badge>
          )}
        </div>
        <p className="text-base md:text-lg text-muted-foreground ml-9">{warehouse.location}</p>
        {warehouse.parent && (
          <p className="text-sm text-muted-foreground mt-2">
            Parent: <span className="font-medium">{warehouse.parent.name}</span>
          </p>
        )}
        {warehouse.children && warehouse.children.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Sub-warehouses: {warehouse.children.length}
          </p>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base md:text-lg font-medium">Total Items</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold">{totalItems}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalQuantity.toLocaleString()} total units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base md:text-lg font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold text-destructive">
              {lowStockItems}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base md:text-lg font-medium">Batches</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold">{totalBatches}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Tracked batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base md:text-lg font-medium">Transfers</CardTitle>
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {incomingTransfers}
                </div>
                <p className="text-xs text-muted-foreground">Incoming</p>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-orange-600 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {outgoingTransfers}
                </div>
                <p className="text-xs text-muted-foreground">Outgoing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory ({totalItems})</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="batches">Batches ({totalBatches})</TabsTrigger>
          {warehouse.children && warehouse.children.length > 0 && (
            <TabsTrigger value="children">Sub-Warehouses ({warehouse.children.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouse.inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory items in this warehouse
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold">Product</TableHead>
                      <TableHead className="text-base font-semibold">SKU</TableHead>
                      <TableHead className="text-base font-semibold">Quantity</TableHead>
                      <TableHead className="text-base font-semibold">Min Level</TableHead>
                      <TableHead className="text-base font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouse.inventory.map((inv: any) => {
                      const minLevel = inv.product.productSettings?.minStockLevel || 0
                      const isLowStock = minLevel > 0 && inv.quantity < minLevel
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium text-base">{inv.product.name}</TableCell>
                          <TableCell className="text-base">{inv.product.sku}</TableCell>
                          <TableCell className="text-base">{inv.quantity}</TableCell>
                          <TableCell className="text-base">{minLevel || '-'}</TableCell>
                          <TableCell className="text-base">
                            {isLowStock ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouse.sourceTransactions.length === 0 && warehouse.destinationTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent transactions
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold">Date</TableHead>
                      <TableHead className="text-base font-semibold">Product</TableHead>
                      <TableHead className="text-base font-semibold">Type</TableHead>
                      <TableHead className="text-base font-semibold">Quantity</TableHead>
                      <TableHead className="text-base font-semibold">Direction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...warehouse.sourceTransactions.map((tx: any) => ({ ...tx, direction: 'Outgoing', warehouse: tx.destinationWarehouse })),
                      ...warehouse.destinationTransactions.map((tx: any) => ({ ...tx, direction: 'Incoming', warehouse: tx.sourceWarehouse })),
                    ]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 20)
                      .map((tx: any) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-base">
                            {format(new Date(tx.timestamp), 'PPp')}
                          </TableCell>
                          <TableCell className="font-medium text-base">{tx.product?.name}</TableCell>
                          <TableCell className="text-base">
                            <Badge variant={tx.type === 'TRANSFER' ? 'outline' : tx.type === 'IN' ? 'default' : 'secondary'}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-base">{tx.quantity}</TableCell>
                          <TableCell className="text-base">
                            <div className="flex items-center gap-2">
                              {tx.direction === 'Incoming' ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  <span>From {tx.warehouse?.name || 'External'}</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-4 w-4 text-orange-600" />
                                  <span>To {tx.warehouse?.name || 'External'}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Product Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouse.batches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No batches tracked in this warehouse
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold">Product</TableHead>
                      <TableHead className="text-base font-semibold">Batch Number</TableHead>
                      <TableHead className="text-base font-semibold">Quantity</TableHead>
                      <TableHead className="text-base font-semibold">Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouse.batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium text-base">{batch.product?.name}</TableCell>
                        <TableCell className="text-base">{batch.batchNumber}</TableCell>
                        <TableCell className="text-base">{batch.quantity}</TableCell>
                        <TableCell className="text-base">
                          {batch.expiryDate ? format(new Date(batch.expiryDate), 'PPP') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {warehouse.children && warehouse.children.length > 0 && (
          <TabsContent value="children" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Sub-Warehouses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold">Name</TableHead>
                      <TableHead className="text-base font-semibold">Location</TableHead>
                      <TableHead className="text-base font-semibold">Type</TableHead>
                      <TableHead className="text-base font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouse.children.map((child: any) => (
                      <TableRow key={child.id}>
                        <TableCell className="font-medium text-base">{child.name}</TableCell>
                        <TableCell className="text-base">{child.location}</TableCell>
                        <TableCell className="text-base">
                          {child.type ? (
                            <Badge variant="outline">{child.type}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-base">
                          <Badge variant={child.status === 'Active' ? 'default' : 'secondary'}>
                            {child.status || 'Active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

