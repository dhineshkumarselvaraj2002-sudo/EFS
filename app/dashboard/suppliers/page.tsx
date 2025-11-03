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
import { Plus, Pencil, Trash2, Users, Package, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { DataTableFilters, FilterOption } from '@/components/filters/data-table-filters'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { format } from 'date-fns'

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

const linkProductSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
})

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLinkProductDialogOpen, setIsLinkProductDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [linkingSupplier, setLinkingSupplier] = useState<any>(null)
  const [viewingSupplier, setViewingSupplier] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  // Server-side pagination
  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', currentPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })
      if (filters.search) params.append('search', filters.search)
      if (filters.productId) params.append('productId', filters.productId)
      if (filters.dateRange_from) params.append('dateFrom', filters.dateRange_from)
      if (filters.dateRange_to) params.append('dateTo', filters.dateRange_to)
      
      const res = await fetch(`/api/suppliers?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      return res.json()
    },
  })

  const suppliers = suppliersData?.suppliers || []
  const totalPages = suppliersData?.totalPages || 0
  const total = suppliersData?.total || 0

  // Fetch all products for filter dropdown (not paginated)
  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1000')
      if (!res.ok) return { products: [] }
      return res.json()
    },
  })
  
  const products = productsData?.products || []

  const createSupplier = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create supplier')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier created')
      setIsDialogOpen(false)
      reset()
    },
  })

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update supplier')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier updated')
      setIsDialogOpen(false)
      reset()
      setEditingSupplier(null)
    },
  })

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete supplier')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted')
    },
  })

  const linkProduct = useMutation({
    mutationFn: async (data: { supplierId: string; productId: string; price: number }) => {
      const res = await fetch('/api/suppliers/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to link product')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Product linked to supplier')
      setIsLinkProductDialogOpen(false)
      linkProductReset()
      setLinkingSupplier(null)
    },
  })

  const {
    register: linkProductRegister,
    handleSubmit: handleLinkProductSubmit,
    formState: { errors: linkProductErrors },
    reset: linkProductReset,
    setValue: setLinkProductValue,
  } = useForm<z.infer<typeof linkProductSchema>>({
    resolver: zodResolver(linkProductSchema),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
  })

  const onSubmit = async (data: z.infer<typeof supplierSchema>) => {
    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({ id: editingSupplier.id, ...data })
      } else {
        await createSupplier.mutateAsync(data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save supplier')
    }
  }

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier)
    setValue('name', supplier.name)
    setValue('contactPerson', supplier.contactPerson || '')
    setValue('phone', supplier.phone || '')
    setValue('email', supplier.email || '')
    setValue('address', supplier.address || '')
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return
    await deleteSupplier.mutateAsync(id)
  }

  const handleLinkProduct = (supplier: any) => {
    setLinkingSupplier(supplier)
    setIsLinkProductDialogOpen(true)
  }

  const handleViewSupplier = async (supplier: any) => {
    // Fetch full supplier details with all relations
    const res = await fetch(`/api/suppliers/${supplier.id}`)
    if (res.ok) {
      const fullSupplier = await res.json()
      setViewingSupplier(fullSupplier)
      setIsViewDialogOpen(true)
    }
  }

  const onLinkProductSubmit = async (data: z.infer<typeof linkProductSchema>) => {
    if (!linkingSupplier) return
    await linkProduct.mutateAsync({
      supplierId: linkingSupplier.id,
      productId: data.productId,
      price: data.price,
    })
  }

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search suppliers by name, contact, email, phone...',
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

  const paginatedSuppliers = suppliers

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
            <Users className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Suppliers</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground ml-9">Manage supplier information</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              reset()
              setEditingSupplier(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Edit' : 'Create'} Supplier</DialogTitle>
              <DialogDescription>
                {editingSupplier ? 'Update' : 'Add'} supplier information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" {...register('contactPerson')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                  {editingSupplier ? 'Update' : 'Create'}
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
          {total} {total === 1 ? 'supplier' : 'suppliers'}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : paginatedSuppliers.length === 0 ? (
            <div className="p-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Suppliers Found</EmptyTitle>
                  <EmptyDescription>
                    {Object.keys(filters).length > 0
                      ? "No suppliers match your current filters. Try adjusting your search criteria."
                      : "You haven't added any suppliers yet. Get started by adding your first supplier."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supplier
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base font-semibold">Name</TableHead>
                  <TableHead className="text-base font-semibold">Contact Person</TableHead>
                  <TableHead className="text-base font-semibold">Phone</TableHead>
                  <TableHead className="text-base font-semibold">Email</TableHead>
                  <TableHead className="text-base font-semibold">Products</TableHead>
                  <TableHead className="text-base font-semibold">Orders</TableHead>
                  <TableHead className="text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map((supplier: any) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium text-base">{supplier.name}</TableCell>
                    <TableCell className="text-base">{supplier.contactPerson || '-'}</TableCell>
                    <TableCell className="text-base">{supplier.phone || '-'}</TableCell>
                    <TableCell className="text-base">{supplier.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {supplier.productSuppliers?.length || 0} product{(supplier.productSuppliers?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {supplier._count?.purchaseOrders || 0} order{(supplier._count?.purchaseOrders || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewSupplier(supplier)}
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleLinkProduct(supplier)}
                          title="Link Product"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-base text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} suppliers
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

      {/* Link Product Dialog */}
      <Dialog open={isLinkProductDialogOpen} onOpenChange={setIsLinkProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Product to Supplier</DialogTitle>
            <DialogDescription>
              Add a product with pricing for {linkingSupplier?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLinkProductSubmit(onLinkProductSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select onValueChange={(value) => setLinkProductValue('productId', value)}>
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
              {linkProductErrors.productId && (
                <p className="text-sm text-destructive">{linkProductErrors.productId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price per Unit</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                {...linkProductRegister('price', { valueAsNumber: true })}
              />
              {linkProductErrors.price && (
                <p className="text-sm text-destructive">{linkProductErrors.price.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={linkProduct.isPending}>
                Link Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>
              View supplier information, linked products, and purchase order history
            </DialogDescription>
          </DialogHeader>
          {viewingSupplier && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList>
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="products">Products ({viewingSupplier.productSuppliers?.length || 0})</TabsTrigger>
                <TabsTrigger value="orders">Purchase Orders ({viewingSupplier.purchaseOrders?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{viewingSupplier.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Person</Label>
                    <p>{viewingSupplier.contactPerson || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p>{viewingSupplier.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{viewingSupplier.email || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <p>{viewingSupplier.address || '-'}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="products">
                {viewingSupplier.productSuppliers && viewingSupplier.productSuppliers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingSupplier.productSuppliers.map((ps: any) => (
                        <TableRow key={ps.id}>
                          <TableCell className="font-medium">{ps.product?.name}</TableCell>
                          <TableCell>{ps.product?.sku}</TableCell>
                          <TableCell>${ps.price.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Package className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No Products Linked</EmptyTitle>
                      <EmptyDescription>
                        This supplier doesn't have any linked products yet.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
              <TabsContent value="orders">
                {viewingSupplier.purchaseOrders && viewingSupplier.purchaseOrders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingSupplier.purchaseOrders.map((po: any) => (
                        <TableRow key={po.id}>
                          <TableCell>{format(new Date(po.createdAt), 'PPp')}</TableCell>
                          <TableCell>{po.product?.name}</TableCell>
                          <TableCell>{po.quantity}</TableCell>
                          <TableCell>
                            <Badge variant={po.status === 'RECEIVED' ? 'secondary' : po.status === 'SENT' ? 'default' : 'outline'}>
                              {po.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Package className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No Purchase Orders</EmptyTitle>
                      <EmptyDescription>
                        This supplier doesn't have any purchase orders yet.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

