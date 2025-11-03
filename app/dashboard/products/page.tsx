'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/lib/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Pencil, Trash2, PackageSearch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast as sonnerToast } from 'sonner'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useErrorToast } from '@/lib/utils/toast-helpers'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
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

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  minStockLevel: z.number().optional(),
  safetyStock: z.number().min(0, 'Safety stock cannot be negative').optional(),
  leadTimeDays: z.number().min(1, 'Lead time must be at least 1 day').optional(),
  stockQuantity: z.number().min(0, 'Stock cannot be negative').optional(),
})

type ProductForm = z.infer<typeof productSchema>

export default function ProductsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { data: products, isLoading } = useProducts()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const { showRetryError } = useErrorToast()

  const queryClient = useQueryClient()

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetch('/api/inventory')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/warehouses')
      if (!res.ok) return []
      return res.json()
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  })

  const updateStock = useMutation({
    mutationFn: async ({ productId, newStock, oldStock, warehouseId }: { 
      productId: string
      newStock: number
      oldStock: number
      warehouseId: string
    }) => {
      const difference = newStock - oldStock
      
      if (difference === 0) return

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: Math.abs(difference),
          type: difference > 0 ? 'IN' : 'OUT',
        }),
      })
      if (!res.ok) throw new Error('Failed to update stock')
      return res.json()
    },
  })

  const onSubmit = async (data: ProductForm) => {
    try {
      const { stockQuantity, ...productData } = data
      
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          ...productData,
        })
        
        // Update stock if changed
        if (stockQuantity !== undefined && warehouses && warehouses.length > 0) {
          const currentStock = inventory
            ?.filter((inv: any) => inv.productId === editingProduct.id)
            .reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0
          
          if (stockQuantity !== currentStock) {
            // Use first warehouse or warehouse with existing stock
            const existingInventory = inventory?.find(
              (inv: any) => inv.productId === editingProduct.id
            )
            const warehouseId = existingInventory?.warehouseId || warehouses[0].id
            
            await updateStock.mutateAsync({
              productId: editingProduct.id,
              newStock: stockQuantity,
              oldStock: currentStock,
              warehouseId,
            })
          }
        }
        
        sonnerToast.success('Product updated')
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
      } else {
        await createProduct.mutateAsync(productData)
        sonnerToast.success('Product created')
      }
      setIsDialogOpen(false)
      reset()
      setEditingProduct(null)
    } catch (error: any) {
      showRetryError(
        'Failed to save product',
        error.message || 'Unable to save the product. Please check your input and try again.',
        () => onSubmit({ ...data } as any)
      )
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    
    // Calculate current stock
    const currentStock = inventory
      ?.filter((inv: any) => inv.productId === product.id)
      .reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0
    
    setValue('name', product.name)
    setValue('sku', product.sku)
    setValue('category', product.category)
    setValue('unit', product.unit)
    setValue('minStockLevel', product.productSettings?.minStockLevel || 0)
    setValue('safetyStock', product.productSettings?.safetyStock || 0)
    setValue('leadTimeDays', product.productSettings?.leadTimeDays || 7)
    setValue('stockQuantity', currentStock)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await deleteProduct.mutateAsync(id)
      sonnerToast.success('Product deleted')
    } catch (error: any) {
      showRetryError(
        'Failed to delete product',
        error.message || 'Unable to delete the product. Please try again.',
        () => handleDelete(id)
      )
    }
  }

  const categories = useMemo(() => {
    const cats = new Set<string>()
    products?.forEach((p: any) => cats.add(p.category))
    return Array.from(cats).sort()
  }, [products])

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search by name or SKU...',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: categories.map(cat => ({ label: cat, value: cat })),
    },
  ], [categories])

  // Calculate total stock for each product
  const productsWithStock = useMemo(() => {
    if (!products || !inventory) return products || []
    
    return products.map((product: any) => {
      const totalStock = inventory
        .filter((inv: any) => inv.productId === product.id)
        .reduce((sum: number, inv: any) => sum + inv.quantity, 0)
      
      return {
        ...product,
        totalStock,
      }
    })
  }, [products, inventory])

  const filteredProducts = useMemo(() => {
    if (!productsWithStock) return []
    return productsWithStock.filter((p: any) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!p.name?.toLowerCase().includes(searchLower) && !p.sku?.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      if (filters.category && p.category !== filters.category) return false
      return true
    })
  }, [productsWithStock, filters])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              reset()
              setEditingProduct(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit' : 'Create'} Product</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Update' : 'Add'} product information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register('sku')} />
                {errors.sku && (
                  <p className="text-sm text-destructive">{errors.sku.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register('category')} />
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" {...register('unit')} placeholder="e.g., kg, pcs, liters" />
                {errors.unit && (
                  <p className="text-sm text-destructive">{errors.unit.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  min="0"
                  {...register('minStockLevel', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum stock level before reorder alert
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="safetyStock">Safety Stock</Label>
                <Input
                  id="safetyStock"
                  type="number"
                  min="0"
                  {...register('safetyStock', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Buffer stock for demand variability (used in predictive ordering)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="1"
                  {...register('leadTimeDays', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Supplier delivery lead time (default: 7 days)
                </p>
              </div>
              {editingProduct && (
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Stock Available</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    {...register('stockQuantity', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current total stock across all warehouses
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createProduct.isPending || updateProduct.isPending || updateStock.isPending}
                >
                  {editingProduct ? 'Update' : 'Create'}
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
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PackageSearch className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Products Found</EmptyTitle>
                  <EmptyDescription>
                    {Object.keys(filters).length > 0
                      ? "No products match your current filters. Try adjusting your search criteria."
                      : "You haven't created any products yet. Get started by adding your first product."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Stock Available</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product: any) => {
                  const minStockLevel = product.productSettings?.minStockLevel || 0
                  const totalStock = product.totalStock || 0
                  const isLowStock = minStockLevel > 0 && totalStock < minStockLevel
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isLowStock ? 'text-destructive font-medium' : ''}>
                            {totalStock}
                          </span>
                          {isLowStock && (
                            <Badge variant="destructive" className="text-xs">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {minStockLevel || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredProducts.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
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

