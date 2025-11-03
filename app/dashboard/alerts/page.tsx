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

  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts')
      if (!res.ok) throw new Error('Failed to fetch alerts')
      return res.json()
    },
  })

  const { data: expiryAlerts, isLoading: expiryLoading, error: expiryError } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/expiry-alerts')
      if (!res.ok) throw new Error('Failed to fetch expiry alerts')
      return res.json()
    },
  })

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
  ], [])

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'stock') {
      if (!alerts) return []
      return alerts.filter((alert: any) => {
        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          const matchesProduct = alert.product?.name?.toLowerCase().includes(searchLower)
          const matchesMessage = alert.message?.toLowerCase().includes(searchLower)
          if (!matchesProduct && !matchesMessage) return false
        }
        // Status filter
        if (filters.status && alert.status !== filters.status) return false
        return true
      })
    } else {
      if (!expiryAlerts) return []
      return expiryAlerts.filter((alert: any) => {
        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          const matchesProduct = alert.batch?.product?.name?.toLowerCase().includes(searchLower)
          const matchesBatch = alert.batch?.batchNumber?.toLowerCase().includes(searchLower)
          const matchesMessage = alert.message?.toLowerCase().includes(searchLower)
          if (!matchesProduct && !matchesBatch && !matchesMessage) return false
        }
        // Status filter
        if (filters.status && alert.status !== filters.status) return false
        return true
      })
    }
  }, [alerts, expiryAlerts, filters, activeTab])

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex)

  // Reset to page 1 when filters or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Monitor stock and expiry alerts</p>
        </div>
        <Button
          onClick={() => checkExpiryAlerts.mutate()}
          disabled={checkExpiryAlerts.isPending}
        >
          Check Expiry Alerts
        </Button>
      </div>

      <DataTableFilters
        filters={filterOptions}
        values={filters}
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onClear={() => setFilters({})}
      />

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
                <div className="p-6 text-center">Loading...</div>
              ) : filteredAlerts.length === 0 ? (
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
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAlerts.map((alert: any) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          {format(new Date(alert.createdAt), 'PPp')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {alert.product?.name}
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
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
                <div className="p-6 text-center">Loading...</div>
              ) : filteredAlerts.length === 0 ? (
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
                      <TableHead>Date</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAlerts.map((alert: any) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          {format(new Date(alert.createdAt), 'PPp')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {alert.batch?.batchNumber}
                        </TableCell>
                        <TableCell>{alert.batch?.product?.name}</TableCell>
                        <TableCell>{alert.message}</TableCell>
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

          {filteredAlerts.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAlerts.length)} of {filteredAlerts.length} alerts
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                  ))}
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

