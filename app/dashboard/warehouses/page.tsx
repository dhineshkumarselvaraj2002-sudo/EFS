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
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, Eye, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  type: z.string().optional(),
  status: z.string().optional(),
  parentId: z.string().optional(),
})

type WarehouseForm = z.infer<typeof warehouseSchema>

export default function WarehousesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/warehouses')
      if (!res.ok) throw new Error('Failed to fetch warehouses')
      return res.json()
    },
  })

  const createWarehouse = useMutation({
    mutationFn: async (data: WarehouseForm) => {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create warehouse')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Warehouse created')
      setIsDialogOpen(false)
      reset()
    },
  })

  const updateWarehouse = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & WarehouseForm) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update warehouse')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Warehouse updated')
      setIsDialogOpen(false)
      reset()
      setEditingWarehouse(null)
    },
  })

  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete warehouse')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Warehouse deleted')
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
  })

  const onSubmit = async (data: WarehouseForm) => {
    if (editingWarehouse) {
      await updateWarehouse.mutateAsync({ id: editingWarehouse.id, ...data })
    } else {
      await createWarehouse.mutateAsync(data)
    }
  }

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse)
    setValue('name', warehouse.name)
    setValue('location', warehouse.location)
    setValue('type', warehouse.type || '')
    setValue('status', warehouse.status || 'Active')
    setValue('parentId', warehouse.parentId || '')
    setIsDialogOpen(true)
  }

  const handleView = (warehouse: any) => {
    window.location.href = `/dashboard/warehouses/${warehouse.id}`
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return
    await deleteWarehouse.mutateAsync(id)
  }

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search warehouses by name or location...',
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'Regional', value: 'Regional' },
        { label: 'Mobile', value: 'Mobile' },
        { label: 'Retail', value: 'Retail' },
        { label: 'Temporary', value: 'Temporary' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
  ], [])

  const filteredWarehouses = useMemo(() => {
    if (!warehouses) return []
    return warehouses.filter((w: any) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!w.name?.toLowerCase().includes(searchLower) &&
            !w.location?.toLowerCase().includes(searchLower) &&
            !w.type?.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      if (filters.type && filters.type !== 'all' && w.type !== filters.type) {
        return false
      }
      if (filters.status && filters.status !== 'all' && w.status !== filters.status) {
        return false
      }
      return true
    })
  }, [warehouses, filters])

  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWarehouses = filteredWarehouses.slice(startIndex, endIndex)

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
            <WarehouseIcon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Warehouses</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground ml-9">Manage warehouse locations</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              reset()
              setEditingWarehouse(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? 'Edit' : 'Create'} Warehouse</DialogTitle>
              <DialogDescription>
                {editingWarehouse ? 'Update' : 'Add'} warehouse information
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
                <Label htmlFor="location">Location *</Label>
                <Input id="location" {...register('location')} />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  onValueChange={(value) => setValue('type', value === 'none' ? '' : value)}
                  defaultValue={editingWarehouse?.type || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(value) => setValue('status', value)}
                  defaultValue={editingWarehouse?.status || 'Active'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Warehouse (Optional)</Label>
                <Select
                  onValueChange={(value) => setValue('parentId', value === 'none' ? '' : value)}
                  defaultValue={editingWarehouse?.parentId || ''}
                  disabled={!warehouses || warehouses.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Level)</SelectItem>
                    {warehouses?.filter((w: any) => w.id !== editingWarehouse?.id).map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this warehouse to a parent warehouse for hierarchical organization
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createWarehouse.isPending || updateWarehouse.isPending}>
                  {editingWarehouse ? 'Update' : 'Create'}
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
          {filteredWarehouses.length} {filteredWarehouses.length === 1 ? 'warehouse' : 'warehouses'}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : filteredWarehouses.length === 0 ? (
            <div className="p-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <WarehouseIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Warehouses Found</EmptyTitle>
                  <EmptyDescription>
                    {Object.keys(filters).length > 0
                      ? "No warehouses match your current filters. Try adjusting your search criteria."
                      : "You haven't added any warehouses yet. Get started by adding your first warehouse."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Warehouse
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base font-semibold">Name</TableHead>
                  <TableHead className="text-base font-semibold">Location</TableHead>
                  <TableHead className="text-base font-semibold">Type</TableHead>
                  <TableHead className="text-base font-semibold">Status</TableHead>
                  <TableHead className="text-base font-semibold">Parent</TableHead>
                  <TableHead className="text-base font-semibold">Items</TableHead>
                  <TableHead className="text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWarehouses.map((warehouse: any) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium text-base">
                      <div className="flex items-center gap-2">
                        {warehouse._count?.children > 0 && (
                          <Network className="h-4 w-4 text-muted-foreground" />
                        )}
                        {warehouse.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-base">{warehouse.location}</TableCell>
                    <TableCell className="text-base">
                      {warehouse.type ? (
                        <Badge variant="outline">{warehouse.type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-base">
                      <Badge variant={warehouse.status === 'Active' ? 'default' : 'secondary'}>
                        {warehouse.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base">
                      {warehouse.parent ? (
                        <span className="text-muted-foreground">{warehouse.parent.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-base">
                      <Badge variant="secondary">{warehouse._count?.inventory || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(warehouse)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(warehouse)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(warehouse.id)}
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

      {filteredWarehouses.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-base text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredWarehouses.length)} of {filteredWarehouses.length} warehouses
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

