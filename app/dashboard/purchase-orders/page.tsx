'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { TableSkeleton } from '@/components/skeleton-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, CheckCircle, ShoppingCart, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Badge } from '@/components/ui/badge'
import { DataTableFilters, FilterOption } from '@/components/filters/data-table-filters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { format } from 'date-fns'

const poSchema = z.object({
  supplierId: z.string().optional(), // Optional - will auto-select cheapest if not provided
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
})

export default function PurchaseOrdersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
  const [receivingPO, setReceivingPO] = useState<any>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  // Server-side pagination
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchase-orders', currentPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.supplierId) params.append('supplierId', filters.supplierId)
      if (filters.dateRange_from) params.append('dateFrom', filters.dateRange_from)
      if (filters.dateRange_to) params.append('dateTo', filters.dateRange_to)
      
      const res = await fetch(`/api/purchase-orders?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch purchase orders')
      return res.json()
    },
  })

  const orders = ordersData?.purchaseOrders || []
  const totalPages = ordersData?.totalPages || 0
  const total = ordersData?.total || 0

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1000')
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
  })

  // Extract array from paginated response (handle both old array format and new object format)
  const products = Array.isArray(productsData) ? productsData : (productsData?.products || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<z.infer<typeof poSchema>>({
    resolver: zodResolver(poSchema),
  })

  // Watch product selection to fetch linked suppliers
  const selectedProductId = watch('productId')
  
  // Fetch linked suppliers for selected product
  const { data: linkedSuppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['product-suppliers', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return []
      const res = await fetch(`/api/products/${selectedProductId}/suppliers`)
      if (!res.ok) throw new Error('Failed to fetch linked suppliers')
      return res.json()
    },
    enabled: !!selectedProductId, // Only fetch when product is selected
  })

  // Reset supplier when product changes (but don't auto-select - let user choose or use auto)
  useEffect(() => {
    if (selectedProductId) {
      setValue('supplierId', '')
    }
  }, [selectedProductId, setValue])

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/warehouses')
      if (!res.ok) throw new Error('Failed to fetch warehouses')
      return res.json()
    },
  })

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetch('/api/inventory')
      if (!res.ok) throw new Error('Failed to fetch inventory')
      return res.json()
    },
  })

  // Filter warehouses for receive dialog - only show warehouses with low stock
  const availableWarehousesForReceive = useMemo(() => {
    if (!receivingPO || !warehouses || !inventory) return []
    
    const productId = receivingPO.productId
    const product = products?.find((p: any) => p.id === productId)
    const minStockLevel = product?.productSettings?.minStockLevel || 0
    
    return warehouses.filter((warehouse: any) => {
      // Find inventory for this product in this warehouse
      const inv = inventory.find(
        (inv: any) => inv.productId === productId && inv.warehouseId === warehouse.id
      )
      
      // Show warehouse if:
      // 1. No inventory exists (quantity = 0)
      // 2. Current quantity is at or below minStockLevel
      const currentQuantity = inv?.quantity || 0
      return currentQuantity <= minStockLevel
    })
  }, [receivingPO, warehouses, inventory, products])

  const createPO = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create purchase order')
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      
      if (data.autoSelectedSupplier) {
        toast.success('Purchase order created', {
          description: `Automatically selected cheapest supplier: ${data.supplier.name} ($${data.supplier.price?.toFixed(2) || '0.00'}/unit)`,
        })
      } else {
        toast.success('Purchase order created')
      }
      
      setIsDialogOpen(false)
      reset()
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to create purchase order'
      
      if (errorMessage.includes('no linked suppliers')) {
        toast.error('Cannot Create Purchase Order', {
          description: 'This product has no linked suppliers. Please link a supplier to this product first in the Suppliers page.',
          duration: 6000,
        })
      } else if (errorMessage.includes('not linked to this product')) {
        toast.error('Invalid Supplier', {
          description: 'The selected supplier is not linked to this product. Please select a linked supplier.',
          duration: 5000,
        })
      } else {
        toast.error('Failed to Create Purchase Order', {
          description: errorMessage,
          duration: 5000,
        })
      }
    },
  })

  const updatePOStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update purchase order')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`Purchase order ${variables.status === 'SENT' ? 'sent' : 'updated'}`)
    },
  })

  const receivePO = useMutation({
    mutationFn: async ({ id, warehouseId, batchNumber, expiryDate }: { id: string; warehouseId: string; batchNumber?: string; expiryDate?: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED', warehouseId, batchNumber, expiryDate }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to receive purchase order')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      toast.success('Purchase order received and inventory updated')
      setIsReceiveDialogOpen(false)
      setReceivingPO(null)
      receiveReset()
    },
  })

  const {
    register: receiveRegister,
    handleSubmit: handleReceiveSubmit,
    formState: { errors: receiveErrors },
    reset: receiveReset,
    setValue: setReceiveValue,
  } = useForm<{ warehouseId: string; batchNumber?: string; expiryDate?: string }>({
    resolver: zodResolver(z.object({ 
      warehouseId: z.string().min(1, 'Warehouse is required'),
      batchNumber: z.string().optional(),
      expiryDate: z.string().optional(),
    })),
  })

  const onSubmit = async (data: z.infer<typeof poSchema>) => {
    await createPO.mutateAsync(data)
  }

  const handleReceive = (po: any) => {
    setReceivingPO(po)
    setIsReceiveDialogOpen(true)
  }

  const onReceiveSubmit = async (data: { warehouseId: string; batchNumber?: string; expiryDate?: string }) => {
    if (receivingPO) {
      await receivePO.mutateAsync({ 
        id: receivingPO.id, 
        warehouseId: data.warehouseId,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'SENT':
        return <Badge variant="default">Sent/Approved</Badge>
      case 'RECEIVED':
        return <Badge variant="secondary">Received</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const handleApprove = (po: any) => {
    updatePOStatus.mutate({ id: po.id, status: 'SENT' })
  }

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search by supplier, product, or status...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Sent', value: 'SENT' },
        { label: 'Received', value: 'RECEIVED' },
      ],
    },
    {
      key: 'supplierId',
      label: 'Supplier',
      type: 'select',
      options: [], // Suppliers filter removed - use search instead
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
    },
  ], [])

  const paginatedOrders = orders

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  return (
    <div className="space-y-8 md:space-y-10">
      <PageBreadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <ShoppingCart className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Purchase Orders</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground ml-9">Manage purchase orders from suppliers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>Create a new purchase order</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select onValueChange={(value) => setValue('productId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product first" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select 
                  onValueChange={(value) => setValue('supplierId', value)}
                  disabled={!selectedProductId || isLoadingSuppliers}
                  value={watch('supplierId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedProductId 
                        ? "Select a product first" 
                        : isLoadingSuppliers 
                        ? "Loading suppliers..." 
                        : "Select linked supplier"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedSuppliers && linkedSuppliers.length > 0 ? (
                      linkedSuppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - ${s.price?.toFixed(2) || '0.00'} per unit
                        </SelectItem>
                      ))
                    ) : selectedProductId ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No suppliers linked to this product
                      </div>
                    ) : null}
                  </SelectContent>
                </Select>
                {selectedProductId && linkedSuppliers && linkedSuppliers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This product has no linked suppliers. Please link a supplier first.
                  </p>
                )}
                {errors.supplierId && (
                  <p className="text-sm text-destructive">{errors.supplierId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createPO.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between">
        <DataTableFilters
          filters={filterOptions}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onClear={() => setFilters({})}
        />
        <div className="text-base text-muted-foreground">
          {total} {total === 1 ? 'order' : 'orders'}
        </div>
      </div>

      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
            <DialogDescription>
              Select warehouse to receive the order into inventory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceiveSubmit(onReceiveSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select onValueChange={(value) => setReceiveValue('warehouseId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !receivingPO
                      ? "Select warehouse"
                      : availableWarehousesForReceive.length === 0
                      ? "No warehouses with low stock"
                      : "Select warehouse"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableWarehousesForReceive.length > 0 ? (
                    availableWarehousesForReceive.map((w: any) => {
                      const inv = inventory?.find(
                        (inv: any) => 
                          inv.productId === receivingPO?.productId && 
                          inv.warehouseId === w.id
                      )
                      const currentQuantity = inv?.quantity || 0
                      const product = products?.find((p: any) => p.id === receivingPO?.productId)
                      const minStockLevel = product?.productSettings?.minStockLevel || 0
                      
                      return (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} {currentQuantity === 0 ? '(No stock)' : `(${currentQuantity}/${minStockLevel} min)`}
                        </SelectItem>
                      )
                    })
                  ) : receivingPO ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      All warehouses have stock above minimum level
                    </div>
                  ) : null}
                </SelectContent>
              </Select>
              {receivingPO && availableWarehousesForReceive.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No warehouses have stock at or below minimum level. Consider creating a new warehouse or adjusting stock levels.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number (Optional)</Label>
              <Input
                id="batchNumber"
                {...receiveRegister('batchNumber')}
                placeholder="Enter batch number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                {...receiveRegister('expiryDate')}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={receivePO.isPending}>
                Receive Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : paginatedOrders.length === 0 ? (
            <div className="p-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShoppingCart className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Purchase Orders Found</EmptyTitle>
                  <EmptyDescription>
                    {Object.keys(filters).length > 0
                      ? "No purchase orders match your current filters. Try adjusting your search criteria."
                      : "You haven't created any purchase orders yet. Get started by creating your first order."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Purchase Order
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base font-semibold py-4 px-4">Date</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Supplier</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Product</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Quantity</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Unit Price</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Total</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Status</TableHead>
                  <TableHead className="text-base font-semibold py-4 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order: any) => {
                  const total = order.unitPrice ? (order.unitPrice * order.quantity).toFixed(2) : '-'
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-base py-4 px-4">
                        {format(new Date(order.createdAt), 'PPp')}
                      </TableCell>
                      <TableCell className="font-medium text-base py-4 px-4">{order.supplier?.name}</TableCell>
                      <TableCell className="text-base py-4 px-4">{order.product?.name}</TableCell>
                      <TableCell className="text-base py-4 px-4">{order.quantity}</TableCell>
                      <TableCell className="text-base py-4 px-4">
                        {order.unitPrice ? `$${order.unitPrice.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-base py-4 px-4">
                        {order.unitPrice ? `$${total}` : '-'}
                      </TableCell>
                      <TableCell className="py-4 px-4">{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="py-4 px-4">
                        {order.status === 'RECEIVED' ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex gap-2">
                            {order.status === 'PENDING' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(order)}
                                disabled={updatePOStatus.isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                            )}
                            {order.status !== 'RECEIVED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReceive(order)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Receive
                              </Button>
                            )}
                          </div>
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

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-base text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} orders
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
    </div>
  )
}

