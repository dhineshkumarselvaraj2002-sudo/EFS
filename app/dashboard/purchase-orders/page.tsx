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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, CheckCircle, ShoppingCart } from 'lucide-react'
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
  supplierId: z.string().min(1, 'Supplier is required'),
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

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-orders')
      if (!res.ok) throw new Error('Failed to fetch purchase orders')
      return res.json()
    },
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers')
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      return res.json()
    },
  })

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/warehouses')
      if (!res.ok) throw new Error('Failed to fetch warehouses')
      return res.json()
    },
  })

  const createPO = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create purchase order')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order created')
      setIsDialogOpen(false)
      reset()
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
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<z.infer<typeof poSchema>>({
    resolver: zodResolver(poSchema),
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
        return <Badge variant="default">Sent</Badge>
      case 'RECEIVED':
        return <Badge variant="secondary">Received</Badge>
      default:
        return <Badge>{status}</Badge>
    }
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
      options: suppliers?.map((s: any) => ({ label: s.name, value: s.id })) || [],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
    },
  ], [suppliers])

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter((order: any) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSupplier = order.supplier?.name?.toLowerCase().includes(searchLower)
        const matchesProduct = order.product?.name?.toLowerCase().includes(searchLower)
        const matchesStatus = order.status?.toLowerCase().includes(searchLower)
        if (!matchesSupplier && !matchesProduct && !matchesStatus) {
          return false
        }
      }

      if (filters.status && order.status !== filters.status) return false
      if (filters.supplierId && order.supplierId !== filters.supplierId) return false
      if (filters.dateRange_from || filters.dateRange_to) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
        if (filters.dateRange_from && orderDate < filters.dateRange_from) return false
        if (filters.dateRange_to && orderDate > filters.dateRange_to) return false
      }
      return true
    })
  }, [orders, filters])

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders from suppliers</p>
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
                <Label>Supplier</Label>
                <Select onValueChange={(value) => setValue('supplierId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select onValueChange={(value) => setValue('productId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
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
        <div className="text-sm text-muted-foreground">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
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
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="p-6 text-center">Loading...</div>
          ) : filteredOrders.length === 0 ? (
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
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {format(new Date(order.createdAt), 'PPp')}
                    </TableCell>
                    <TableCell className="font-medium">{order.supplier?.name}</TableCell>
                    <TableCell>{order.product?.name}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredOrders.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
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
    </div>
  )
}

