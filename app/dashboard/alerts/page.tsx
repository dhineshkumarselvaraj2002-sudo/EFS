'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Info, Bell } from 'lucide-react'
import { format } from 'date-fns'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { toast as sonnerToast } from 'sonner'
import { useErrorToast } from '@/lib/utils/toast-helpers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { TableSkeleton } from '@/components/skeleton-table'
import { DataTableFilters, FilterOption } from '@/components/filters/data-table-filters'
import { useMemo, useState, useEffect } from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export default function AlertsPage() {
  const queryClient = useQueryClient()
  const { showRetryError } = useErrorToast()
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState('stock')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Server-side pagination for stock alerts
  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ['alerts', currentPage, filters, activeTab],
    queryFn: async () => {
      if (activeTab !== 'stock') return { alerts: [], total: 0, totalPages: 0 }
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.productId) params.append('productId', filters.productId)
      if (filters.dateRange_from) params.append('dateFrom', filters.dateRange_from)
      if (filters.dateRange_to) params.append('dateTo', filters.dateRange_to)
      
      const res = await fetch(`/api/alerts?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch alerts')
      return res.json()
    },
  })

  // Server-side pagination for expiry alerts
  const { data: expiryAlertsData, isLoading: expiryLoading, error: expiryError } = useQuery({
    queryKey: ['expiry-alerts', currentPage, filters, activeTab],
    queryFn: async () => {
      if (activeTab !== 'expiry') return { expiryAlerts: [], total: 0, totalPages: 0 }
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.productId) params.append('productId', filters.productId)
      if (filters.dateRange_from) params.append('dateFrom', filters.dateRange_from)
      if (filters.dateRange_to) params.append('dateTo', filters.dateRange_to)
      
      const res = await fetch(`/api/expiry-alerts?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch expiry alerts')
      return res.json()
    },
  })

  const alerts = alertsData?.alerts || []
  const expiryAlerts = expiryAlertsData?.expiryAlerts || []
  const totalPages = activeTab === 'stock' 
    ? (alertsData?.totalPages || 0) 
    : (expiryAlertsData?.totalPages || 0)
  const total = activeTab === 'stock'
    ? (alertsData?.total || 0)
    : (expiryAlertsData?.total || 0)

  const markAsRead = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'stock' | 'expiry' }) => {
      const endpoint = type === 'stock' ? '/api/alerts' : '/api/expiry-alerts'
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'READ' }),
      })
      if (!res.ok) throw new Error('Failed to update alert')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] })
      sonnerToast.success('Alert marked as read')
    },
    onError: (error: any) => {
      showRetryError(
        'Failed to update alert',
        error.message || 'Unable to mark alert as read. Please try again.',
        () => {
          // This will be handled by the individual button click
        }
      )
    },
  })

  const checkExpiryAlerts = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/expiry-alerts', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to check expiry alerts')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] })
      sonnerToast.success('Expiry alerts checked')
    },
    onError: (error: any) => {
      showRetryError(
        'Failed to check expiry alerts',
        error.message || 'Unable to check for expiring batches. Please try again.',
        () => checkExpiryAlerts.mutate()
      )
    },
  })

  const handleMarkAsRead = (id: string, type: 'stock' | 'expiry') => {
    markAsRead.mutate({ id, type })
  }

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) return []
      return res.json()
    },
  })

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search alerts by product, message, or batch...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'New', value: 'NEW' },
        { label: 'Read', value: 'READ' },
      ],
    },
    {
      key: 'productId',
      label: 'Product',
      type: 'select',
      options: products?.map((p: any) => ({ label: p.name, value: p.id })) || [],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
    },
  ], [products])

  const paginatedAlerts = activeTab === 'stock' ? alerts : expiryAlerts

  // Reset to page 1 when filters or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  return (
    <div className="space-y-8 md:space-y-10">
      <PageBreadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Bell className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Alerts</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground ml-9">Monitor stock and expiry alerts</p>
        </div>
        <Button
          onClick={() => checkExpiryAlerts.mutate()}
          disabled={checkExpiryAlerts.isPending}
        >
          Check Expiry Alerts
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 w-full">
        <div className="w-full sm:w-auto">
          <DataTableFilters
            filters={filterOptions}
            values={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClear={() => setFilters({})}
          />
        </div>
        <div className="text-base text-muted-foreground whitespace-nowrap">
          {total} {total === 1 ? 'alert' : 'alerts'}
        </div>
      </div>

      {/* Error alerts */}
      {alertsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load alerts</AlertTitle>
          <AlertDescription>
            Unable to fetch stock alerts. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      )}

      {expiryError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load expiry alerts</AlertTitle>
          <AlertDescription>
            Unable to fetch expiry alerts. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Alerts</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0">
              {alertsLoading ? (
                <TableSkeleton rows={8} cols={5} />
              ) : paginatedAlerts.length === 0 ? (
                <div className="p-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Bell className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No Stock Alerts</EmptyTitle>
                      <EmptyDescription>
                        {Object.keys(filters).length > 0
                          ? "No stock alerts match your current filters."
                          : "All inventory levels are within acceptable ranges. No action needed."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold">Date</TableHead>
                      <TableHead className="text-base font-semibold">Product</TableHead>
                      <TableHead className="text-base font-semibold">Message</TableHead>
                      <TableHead className="text-base font-semibold">Status</TableHead>
                      <TableHead className="text-base font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAlerts.map((alert: any) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-base">
                          {format(new Date(alert.createdAt), 'PPp')}
                        </TableCell>
                        <TableCell className="font-medium text-base">
                          {alert.product?.name}
                        </TableCell>
                        <TableCell className="text-base">{alert.message}</TableCell>
                        <TableCell>
                          {alert.status === 'NEW' ? (
                            <Badge variant="destructive">New</Badge>
                          ) : (
                            <Badge variant="secondary">Read</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.status === 'NEW' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(alert.id, 'stock')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Read
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry">
          <Card>
            <CardContent className="p-0">
              {expiryLoading ? (
                <TableSkeleton rows={8} cols={5} />
              ) : paginatedAlerts.length === 0 ? (
                <div className="p-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CheckCircle className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No Expiry Alerts</EmptyTitle>
                      <EmptyDescription>
                        {Object.keys(filters).length > 0
                          ? "No expiry alerts match your current filters."
                          : "No batches are expiring soon. Your inventory is up to date."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base font-semibold">Date</TableHead>
                      <TableHead className="text-base font-semibold">Batch</TableHead>
                      <TableHead className="text-base font-semibold">Product</TableHead>
                      <TableHead className="text-base font-semibold">Message</TableHead>
                      <TableHead className="text-base font-semibold">Status</TableHead>
                      <TableHead className="text-base font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAlerts.map((alert: any) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-base">
                          {format(new Date(alert.createdAt), 'PPp')}
                        </TableCell>
                        <TableCell className="font-medium text-base">
                          {alert.batch?.batchNumber}
                        </TableCell>
                        <TableCell className="text-base">{alert.batch?.product?.name}</TableCell>
                        <TableCell className="text-base">{alert.message}</TableCell>
                        <TableCell>
                          {alert.status === 'NEW' ? (
                            <Badge variant="destructive">New</Badge>
                          ) : (
                            <Badge variant="secondary">Read</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.status === 'NEW' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(alert.id, 'expiry')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Read
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {total > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-base text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} alerts
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) setCurrentPage(currentPage - 1)
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {(() => {
                    // Calculate which 5 pages to show
                    let startPage = Math.max(1, currentPage - 2)
                    let endPage = Math.min(totalPages, startPage + 4)
                    
                    // Adjust if we're near the end
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4)
                    }
                    
                    const pages = []
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i)
                    }
                    
                    return pages.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage(page)
                          }}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))
                  })()}
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

