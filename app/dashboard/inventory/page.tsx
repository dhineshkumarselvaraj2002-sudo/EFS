'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { pusherClient } from '@/lib/pusher-client'
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
import { Plus, ArrowRightLeft, Package, PackageSearch } from 'lucide-react'
import { toast } from 'sonner'
import { BatchExpiryBadge } from '@/components/batch-expiry-badge'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/skeleton-table'
import { format } from 'date-fns'
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
  supplierId: z.string().optional(),
  userId: z.string().optional(),
  reason: z.string().optional(),
})

const transferSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
  destinationWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  reason: z.string().optional(),
})

// Component for inventory row with batch information
function InventoryRow({ inventory, minLevel, isLowStock, globalTotal }: { 
  inventory: any
  minLevel: number
  isLowStock: boolean
  globalTotal: number
}) {
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  useEffect(() => {
    // Fetch batches for this inventory item
    const fetchBatches = async () => {
      setLoadingBatches(true)
      try {
        const res = await fetch(
          `/api/inventory/batches?productId=${inventory.productId}&warehouseId=${inventory.warehouseId}`
        )
        if (res.ok) {
          const data = await res.json()
          setBatches(data)
        }
      } catch (error) {
        console.error('Failed to fetch batches:', error)
      } finally {
        setLoadingBatches(false)
      }
    }

    fetchBatches()
  }, [inventory.productId, inventory.warehouseId])

  // Get earliest expiring batch
  const earliestBatch = batches.length > 0 ? batches[0] : null

  return (
    <TableRow key={inventory.id}>
      <TableCell className="font-medium text-base whitespace-nowrap">{inventory.product?.name}</TableCell>
      <TableCell className="text-base whitespace-nowrap">{inventory.product?.sku}</TableCell>
      <TableCell className="text-base whitespace-nowrap">{inventory.warehouse?.name}</TableCell>
      <TableCell className="text-base whitespace-nowrap">{inventory.quantity}</TableCell>
      <TableCell className="text-base whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-medium">{globalTotal}</span>
          {globalTotal !== inventory.quantity && (
            <Badge variant="secondary" className="text-sm whitespace-nowrap">
              {globalTotal - inventory.quantity > 0 ? '+' : ''}
              {globalTotal - inventory.quantity} in other locations
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-base whitespace-nowrap">{minLevel || '-'}</TableCell>
      <TableCell className="text-base whitespace-nowrap">
        {loadingBatches ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : earliestBatch?.expiryDate ? (
          <BatchExpiryBadge
            expiryDate={earliestBatch.expiryDate}
            batchNumber={earliestBatch.batchNumber}
            variant="compact"
          />
        ) : batches.length > 0 ? (
          <Badge variant="secondary">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No batches</span>
        )}
      </TableCell>
      <TableCell className="text-base whitespace-nowrap">
        {isLowStock ? (
          <span className="text-destructive font-medium">Low Stock</span>
        ) : (
          <span className="text-muted-foreground">OK</span>
        )}
      </TableCell>
    </TableRow>
  )
}

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
      // Client-side validation before making request
      if (!data.productId || !data.sourceWarehouseId || !data.destinationWarehouseId) {
        throw new Error('Please select product, source warehouse, and destination warehouse')
      }

      if (!data.quantity || data.quantity <= 0) {
        throw new Error('Quantity must be greater than 0')
      }

      if (data.sourceWarehouseId === data.destinationWarehouseId) {
        throw new Error('Source and destination warehouses cannot be the same')
      }

      // Check available stock before transfer
      const sourceInventory = inventory?.find(
        (inv: any) => inv.productId === data.productId && inv.warehouseId === data.sourceWarehouseId
      )

      if (!sourceInventory) {
        throw new Error('No stock available in the source warehouse for this product')
      }

      if (sourceInventory.quantity < data.quantity) {
        throw new Error(
          `Insufficient stock. Available: ${sourceInventory.quantity} units, Requested: ${data.quantity} units`
        )
      }

      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to transfer stock')
      }

      return responseData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Stock transferred successfully')
      setIsTransferDialogOpen(false)
      transferReset()
    },
    onError: (error: any) => {
      toast.error('Transfer Failed', {
        description: error.message || 'Unable to transfer stock. Please check your input and try again.',
      })
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
  const transferProductId = watchTransfer('productId')
  const selectedProductId = watchStock('productId')
  const selectedSupplierId = watchStock('supplierId')
  const selectedUserId = watchStock('userId')
  const destinationWarehouseId = watchTransfer('destinationWarehouseId')

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers')
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      return res.json()
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })

  // Fetch linked suppliers for selected product (for Stock In)
  const { data: linkedSuppliers } = useQuery({
    queryKey: ['product-suppliers', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return []
      const res = await fetch(`/api/products/${selectedProductId}/suppliers`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedProductId && stockType === 'IN',
  })

  // Auto-update reason based on supplier (for IN) or user (for OUT)
  useEffect(() => {
    if (stockType === 'IN' && selectedSupplierId && linkedSuppliers) {
      const supplier = linkedSuppliers.find((s: any) => s.id === selectedSupplierId)
      if (supplier) {
        setStockValue('reason', `Stock In from ${supplier.name}`)
      }
    } else if (stockType === 'OUT' && selectedUserId && users) {
      const user = users.find((u: any) => u.id === selectedUserId)
      if (user) {
        setStockValue('reason', `Stock Out to ${user.name}`)
      }
    }
  }, [stockType, selectedSupplierId, selectedUserId, linkedSuppliers, users, setStockValue])

  // Auto-update reason for transfers based on destination warehouse
  useEffect(() => {
    if (destinationWarehouseId && warehouses) {
      const warehouse = warehouses.find((w: any) => w.id === destinationWarehouseId)
      if (warehouse) {
        setTransferValue('reason', `Transfer to ${warehouse.name}`)
      }
    }
  }, [destinationWarehouseId, warehouses, setTransferValue])

  // Filter warehouses with available stock for transfer source
  const availableWarehouses = useMemo(() => {
    if (!transferProductId || !inventory) return warehouses || []
    
    return warehouses?.filter((warehouse: any) => {
      const inv = inventory.find(
        (inv: any) => inv.productId === transferProductId && inv.warehouseId === warehouse.id
      )
      return inv && inv.quantity > 0
    }) || []
  }, [transferProductId, inventory, warehouses])

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

  // Subscribe to Pusher for live inventory updates
  useEffect(() => {
    const channel = pusherClient.subscribe('inventory-updates')
    
    channel.bind('item-changed', (data: any) => {
      // Invalidate and refetch inventory data
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      
      // Show toast notification
      if (data.message) {
        toast.info('Inventory Updated', {
          description: data.message,
        })
      }
    })

    return () => {
      pusherClient.unsubscribe('inventory-updates')
    }
  }, [queryClient])

  return (
    <div className="space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
      <PageBreadcrumb />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <PackageSearch className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Inventory</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground ml-9">Manage stock levels across warehouses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                    onValueChange={(value) => {
                      setTransferValue('sourceWarehouseId', value)
                      // Reset destination if same as source
                      if (value === watchTransfer('destinationWarehouseId')) {
                        setTransferValue('destinationWarehouseId', '')
                      }
                    }}
                    defaultValue={watchTransfer('sourceWarehouseId')}
                    disabled={!transferProductId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !transferProductId 
                          ? "Select product first" 
                          : availableWarehouses.length === 0
                          ? "No stock available"
                          : "Select source warehouse"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWarehouses.length > 0 ? (
                        availableWarehouses.map((w: any) => {
                          const inv = inventory?.find(
                            (inv: any) => inv.productId === transferProductId && inv.warehouseId === w.id
                          )
                          return (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name} ({inv?.quantity || 0} available)
                            </SelectItem>
                          )
                        })
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {!transferProductId 
                            ? "Please select a product first" 
                            : "No warehouses have stock for this product"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {transferProductId && availableWarehouses.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No warehouses have available stock for this product
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Destination Warehouse</Label>
                  <Select
                    onValueChange={(value) => setTransferValue('destinationWarehouseId', value)}
                    defaultValue={watchTransfer('destinationWarehouseId')}
                    disabled={!transferProductId || !watchTransfer('sourceWarehouseId')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !transferProductId 
                          ? "Select product first" 
                          : !watchTransfer('sourceWarehouseId')
                          ? "Select source warehouse first"
                          : "Select destination warehouse"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter((w: any) => w.id !== watchTransfer('sourceWarehouseId')).map((w: any) => (
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
                    min="1"
                    step="1"
                    {...transferRegister('quantity', { 
                      valueAsNumber: true,
                      min: { value: 1, message: 'Quantity must be at least 1' },
                      validate: (value) => {
                        if (!value || value <= 0) {
                          return 'Quantity must be greater than 0'
                        }
                        if (!Number.isInteger(value)) {
                          return 'Quantity must be a whole number'
                        }
                        // Check available stock
                        if (watchTransfer('productId') && watchTransfer('sourceWarehouseId')) {
                          const sourceInv = inventory?.find(
                            (inv: any) => 
                              inv.productId === watchTransfer('productId') && 
                              inv.warehouseId === watchTransfer('sourceWarehouseId')
                          )
                          if (sourceInv && value > sourceInv.quantity) {
                            return `Available stock: ${sourceInv.quantity} units`
                          }
                        }
                        return true
                      },
                    })}
                  />
                  {transferErrors.quantity && (
                    <p className="text-sm text-destructive">{transferErrors.quantity.message}</p>
                  )}
                  {watchTransfer('productId') && watchTransfer('sourceWarehouseId') && (() => {
                    const sourceInv = inventory?.find(
                      (inv: any) => 
                        inv.productId === watchTransfer('productId') && 
                        inv.warehouseId === watchTransfer('sourceWarehouseId')
                    )
                    return sourceInv ? (
                      <p className="text-xs text-muted-foreground">
                        Available: {sourceInv.quantity} units
                      </p>
                    ) : null
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-reason">Reason</Label>
                  <Input
                    id="transfer-reason"
                    {...transferRegister('reason')}
                    placeholder="Reason (auto-filled with destination warehouse name)"
                  />
                  {transferErrors.reason && (
                    <p className="text-sm text-destructive">{transferErrors.reason.message}</p>
                  )}
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
                      <Label>Supplier</Label>
                      <Select
                        onValueChange={(value) => setStockValue('supplierId', value)}
                        defaultValue={watchStock('supplierId')}
                        disabled={!selectedProductId || !linkedSuppliers || linkedSuppliers.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedProductId
                              ? "Select product first"
                              : !linkedSuppliers || linkedSuppliers.length === 0
                              ? "No suppliers linked"
                              : "Select supplier"
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
                      {selectedProductId && (!linkedSuppliers || linkedSuppliers.length === 0) && (
                        <p className="text-xs text-muted-foreground">
                          Link suppliers to this product in the Suppliers page
                        </p>
                      )}
                    </div>
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
                {stockType === 'OUT' && (
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select
                      onValueChange={(value) => setStockValue('userId', value)}
                      defaultValue={watchStock('userId')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    {...stockRegister('reason')}
                    placeholder={
                      stockType === 'IN'
                        ? "Reason (auto-filled with supplier name)"
                        : "Reason (auto-filled with username)"
                    }
                  />
                  {stockErrors.reason && (
                    <p className="text-sm text-destructive">{stockErrors.reason.message}</p>
                  )}
                </div>
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
          {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
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
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px] text-base font-semibold">Product</TableHead>
                    <TableHead className="min-w-[100px] text-base font-semibold">SKU</TableHead>
                    <TableHead className="min-w-[120px] text-base font-semibold">Warehouse</TableHead>
                    <TableHead className="min-w-[80px] text-base font-semibold">Quantity</TableHead>
                    <TableHead className="min-w-[100px] text-base font-semibold">Global Total</TableHead>
                    <TableHead className="min-w-[80px] text-base font-semibold">Min Level</TableHead>
                    <TableHead className="min-w-[100px] text-base font-semibold">Batches</TableHead>
                    <TableHead className="min-w-[100px] text-base font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInventory.map((inv: any) => {
                    const minLevel = inv.product?.productSettings?.minStockLevel || 0
                    const isLowStock = inv.quantity < minLevel && minLevel > 0
                    return (
                      <InventoryRow
                        key={inv.id}
                        inventory={inv}
                        minLevel={minLevel}
                        isLowStock={isLowStock}
                        globalTotal={inv.globalTotal || 0}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredInventory.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <div className="text-base text-muted-foreground whitespace-nowrap">
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

