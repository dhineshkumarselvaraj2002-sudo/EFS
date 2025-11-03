'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Plus, ArrowRightLeft, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTableFilters, FilterOption } from '@/components/filters/data-table-filters'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const stockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  type: z.enum(['IN', 'OUT']),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
})

const transferSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
  destinationWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
})

export default function InventoryPage() {
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetch('/api/inventory')
      if (!res.ok) throw new Error('Failed to fetch inventory')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
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

  const updateStock = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update stock')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Stock updated')
      setIsStockDialogOpen(false)
      stockReset()
    },
  })

  const transferStock = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to transfer stock')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Stock transferred')
      setIsTransferDialogOpen(false)
      transferReset()
    },
  })

  const {
    register: stockRegister,
    handleSubmit: handleStockSubmit,
    formState: { errors: stockErrors },
    reset: stockReset,
    watch: watchStock,
    setValue: setStockValue,
  } = useForm<z.infer<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
  })

  const {
    register: transferRegister,
    handleSubmit: handleTransferSubmit,
    formState: { errors: transferErrors },
    reset: transferReset,
    setValue: setTransferValue,
    watch: watchTransfer,
  } = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
  })

  const stockType = watchStock('type')

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search products...',
    },
    {
      key: 'productId',
      label: 'Product',
      type: 'select',
      options: products?.map((p: any) => ({ label: `${p.name} (${p.sku})`, value: p.id })) || [],
    },
    {
      key: 'warehouseId',
      label: 'Warehouse',
      type: 'select',
      options: warehouses?.map((w: any) => ({ label: w.name, value: w.id })) || [],
    },
    {
      key: 'status',
      label: 'Stock Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Low Stock', value: 'low' },
        { label: 'OK', value: 'ok' },
      ],
    },
  ], [products, warehouses])

  const filteredInventory = useMemo(() => {
    if (!inventory) return []
    
    return inventory.filter((inv: any) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesName = inv.product?.name?.toLowerCase().includes(searchLower)
        const matchesSku = inv.product?.sku?.toLowerCase().includes(searchLower)
        const matchesWarehouse = inv.warehouse?.name?.toLowerCase().includes(searchLower)
        if (!matchesName && !matchesSku && !matchesWarehouse) return false
      }

      // Product filter
      if (filters.productId && inv.productId !== filters.productId) return false

      // Warehouse filter
      if (filters.warehouseId && inv.warehouseId !== filters.warehouseId) return false

      // Status filter
      if (filters.status && filters.status !== 'all') {
        const minLevel = inv.product?.productSettings?.minStockLevel || 0
        const isLowStock = inv.quantity < minLevel && minLevel > 0
        if (filters.status === 'low' && !isLowStock) return false
        if (filters.status === 'ok' && isLowStock) return false
      }

      return true
    })
  }, [inventory, filters])

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Manage stock levels across warehouses</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Stock</DialogTitle>
                <DialogDescription>Move stock between warehouses</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransferSubmit((data) => transferStock.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select
                    onValueChange={(value) => setTransferValue('productId', value)}
                    defaultValue={watchTransfer('productId')}
                  >
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
                  <Label>Source Warehouse</Label>
                  <Select
                    onValueChange={(value) => setTransferValue('sourceWarehouseId', value)}
                    defaultValue={watchTransfer('sourceWarehouseId')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source warehouse" />
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
                  <Label>Destination Warehouse</Label>
                  <Select
                    onValueChange={(value) => setTransferValue('destinationWarehouseId', value)}
                    defaultValue={watchTransfer('destinationWarehouseId')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination warehouse" />
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
                  <Label htmlFor="transfer-quantity">Quantity</Label>
                  <Input
                    id="transfer-quantity"
                    type="number"
                    {...transferRegister('quantity', { valueAsNumber: true })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={transferStock.isPending}>
                    Transfer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adjust Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock</DialogTitle>
                <DialogDescription>Add or remove stock</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStockSubmit((data) => updateStock.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select
                    onValueChange={(value) => setStockValue('productId', value)}
                    defaultValue={watchStock('productId')}
                  >
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
                  <Label>Warehouse</Label>
                  <Select
                    onValueChange={(value) => setStockValue('warehouseId', value)}
                    defaultValue={watchStock('warehouseId')}
                  >
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
                  <Label>Type</Label>
                  <Select
                    onValueChange={(value) => setStockValue('type', value as 'IN' | 'OUT')}
                    defaultValue={watchStock('type')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Stock In</SelectItem>
                      <SelectItem value="OUT">Stock Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    {...stockRegister('quantity', { valueAsNumber: true })}
                  />
                </div>
                {stockType === 'IN' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="batchNumber">Batch Number (Optional)</Label>
                      <Input id="batchNumber" {...stockRegister('batchNumber')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                      <Input id="expiryDate" type="date" {...stockRegister('expiryDate')} />
                    </div>
                  </>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={updateStock.isPending}>
                    Update Stock
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <DataTableFilters
          filters={filterOptions}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onClear={() => setFilters({})}
        />
        <div className="text-sm text-muted-foreground">
          {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Inventory Found</EmptyTitle>
                  <EmptyDescription>
                    {Object.keys(filters).length > 0
                      ? "No inventory items match your current filters. Try adjusting your search criteria."
                      : "You don't have any inventory items yet. Get started by adjusting stock levels."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setIsStockDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adjust Stock
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInventory.map((inv: any) => {
                  const minLevel = inv.product?.productSettings?.minStockLevel || 0
                  const isLowStock = inv.quantity < minLevel
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.product?.name}</TableCell>
                      <TableCell>{inv.product?.sku}</TableCell>
                      <TableCell>{inv.warehouse?.name}</TableCell>
                      <TableCell>{inv.quantity}</TableCell>
                      <TableCell>{minLevel || '-'}</TableCell>
                      <TableCell>
                        {isLowStock && minLevel > 0 ? (
                          <span className="text-destructive font-medium">Low Stock</span>
                        ) : (
                          <span className="text-muted-foreground">OK</span>
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

      {filteredInventory.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredInventory.length)} of {filteredInventory.length} items
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

