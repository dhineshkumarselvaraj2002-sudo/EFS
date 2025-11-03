'use client'

import { useQuery } from '@tanstack/react-query'
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
import { format } from 'date-fns'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ArrowRightLeft } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
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

export default function TransactionsPage() {
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?limit=100')
      if (!res.ok) throw new Error('Failed to fetch transactions')
      return res.json()
    },
  })

  const products = useMemo(() => {
    const prods = new Set<string>()
    data?.transactions?.forEach((tx: any) => {
      if (tx.product) prods.add(JSON.stringify({ id: tx.product.id, name: tx.product.name }))
    })
    return Array.from(prods).map(p => JSON.parse(p))
  }, [data])

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search by product, warehouse, or type...',
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'Stock In', value: 'IN' },
        { label: 'Stock Out', value: 'OUT' },
        { label: 'Transfer', value: 'TRANSFER' },
      ],
    },
    {
      key: 'productId',
      label: 'Product',
      type: 'select',
      options: products.map((p: any) => ({ label: p.name, value: p.id })),
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
    },
  ], [products])

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return []
    return data.transactions.filter((tx: any) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesProduct = tx.product?.name?.toLowerCase().includes(searchLower)
        const matchesSource = tx.sourceWarehouse?.name?.toLowerCase().includes(searchLower)
        const matchesDestination = tx.destinationWarehouse?.name?.toLowerCase().includes(searchLower)
        const matchesType = tx.type?.toLowerCase().includes(searchLower)
        if (!matchesProduct && !matchesSource && !matchesDestination && !matchesType) {
          return false
        }
      }

      if (filters.type && tx.type !== filters.type) return false
      if (filters.productId && tx.productId !== filters.productId) return false
      if (filters.dateRange_from || filters.dateRange_to) {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0]
        if (filters.dateRange_from && txDate < filters.dateRange_from) return false
        if (filters.dateRange_to && txDate > filters.dateRange_to) return false
      }
      return true
    })
  }, [data, filters])

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IN':
        return <Badge variant="default">Stock In</Badge>
      case 'OUT':
        return <Badge variant="destructive">Stock Out</Badge>
      case 'TRANSFER':
        return <Badge variant="outline">Transfer</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">View all inventory transactions</p>
      </div>

      <div className="flex items-center justify-between">
        <DataTableFilters
          filters={filterOptions}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onClear={() => setFilters({})}
        />
        <div className="text-sm text-muted-foreground">
          {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ArrowRightLeft className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Transactions Found</EmptyTitle>
                  <EmptyDescription>
                    {Object.keys(filters).length > 0
                      ? "No transactions match your current filters. Try adjusting your search criteria."
                      : "No transactions have been recorded yet. Transactions will appear here when you adjust stock or transfer items."}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {format(new Date(tx.timestamp), 'PPp')}
                    </TableCell>
                    <TableCell className="font-medium">{tx.product?.name}</TableCell>
                    <TableCell>{getTypeBadge(tx.type)}</TableCell>
                    <TableCell>{tx.quantity}</TableCell>
                    <TableCell>{tx.sourceWarehouse?.name || '-'}</TableCell>
                    <TableCell>{tx.destinationWarehouse?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredTransactions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
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

