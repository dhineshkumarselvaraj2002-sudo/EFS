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
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ArrowRightLeft, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
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
import { TableSkeleton } from '@/components/skeleton-table'
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
        { label: 'Return', value: 'RETURN' },
        { label: 'Usage', value: 'USAGE' },
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
    const filtered = data.transactions.filter((tx: any) => {
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
    
    // Sort by date (timestamp) - newest first (descending order)
    return filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return dateB - dateA // Descending order (newest first)
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
      case 'RETURN':
        return <Badge variant="secondary">Return</Badge>
      case 'USAGE':
        return <Badge variant="destructive">Usage</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  const getFromDisplay = (tx: any) => {
    // For IN/RETURN transactions: show supplier name
    if (tx.type === 'IN' || tx.type === 'RETURN') {
      if (tx.supplier?.name) {
        return tx.supplier.name
      }
      // Fallback to warehouse if supplier not found
      return tx.sourceWarehouse?.name || 'External'
    }
    // For OUT/USAGE: stock comes from a warehouse
    if (tx.type === 'OUT' || tx.type === 'USAGE') {
      return tx.sourceWarehouse?.name || tx.destinationWarehouse?.name || 'External'
    }
    // For TRANSFER: source warehouse should always exist
    return tx.sourceWarehouse?.name || tx.destinationWarehouse?.name || '-'
  }

  const getToDisplay = (tx: any) => {
    // For OUT/USAGE transactions: show user name
    if (tx.type === 'OUT' || tx.type === 'USAGE') {
      if (tx.user?.name) {
        return tx.user.name
      }
      // Fallback to warehouse if user not found
      return tx.destinationWarehouse?.name || 'External'
    }
    // For IN/RETURN: stock goes to warehouse
    if (tx.type === 'IN' || tx.type === 'RETURN') {
      return tx.destinationWarehouse?.name || tx.sourceWarehouse?.name || 'External'
    }
    // For TRANSFER: destination warehouse should always exist
    return tx.destinationWarehouse?.name || tx.sourceWarehouse?.name || '-'
  }

  const exportToExcel = async () => {
    try {
      // Fetch all transactions (not paginated)
      const res = await fetch('/api/transactions?limit=10000')
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const allData = await res.json()
      const allTransactions = allData?.transactions || []

      if (allTransactions.length === 0) {
        alert('No transactions to export')
        return
      }

      // Prepare data for Excel
      const excelData = allTransactions.map((tx: any) => {
        const fromDisplay = getFromDisplay(tx)
        const toDisplay = getToDisplay(tx)
        
        return {
          'Date': format(new Date(tx.timestamp), 'yyyy-MM-dd'),
          'Time': format(new Date(tx.timestamp), 'HH:mm:ss'),
          'Product': tx.product?.name || '-',
          'Product SKU': tx.product?.sku || '-',
          'Type': tx.type,
          'Quantity': tx.quantity,
          'From': fromDisplay,
          'To': toDisplay,
          'User Name': tx.user?.name || '-',
          'User Email': tx.user?.email || '-',
          'Reason': tx.reason || '-',
          'Department': tx.department || '-',
          'Source Warehouse': tx.sourceWarehouse?.name || '-',
          'Destination Warehouse': tx.destinationWarehouse?.name || '-',
        }
      })

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

      // Generate filename with current date
      const fileName = `transactions_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`

      // Write and download
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export transactions to Excel')
    }
  }

  return (
    <div className="space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
      <PageBreadcrumb />
      <div>
        <div className="flex items-center gap-3 mb-3">
          <ArrowRightLeft className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Transactions</h1>
        </div>
        <p className="text-base md:text-lg text-muted-foreground ml-9">View all inventory transactions</p>
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
        <div className="flex items-center gap-4">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
          <div className="text-base text-muted-foreground whitespace-nowrap">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
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
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px] text-base font-semibold py-4 px-4">Date</TableHead>
                    <TableHead className="min-w-[150px] text-base font-semibold py-4 px-4">Product</TableHead>
                    <TableHead className="min-w-[100px] text-base font-semibold py-4 px-4">Type</TableHead>
                    <TableHead className="min-w-[80px] text-base font-semibold py-4 px-4">Quantity</TableHead>
                    <TableHead className="min-w-[120px] text-base font-semibold py-4 px-4">From</TableHead>
                    <TableHead className="min-w-[120px] text-base font-semibold py-4 px-4">To</TableHead>
                    <TableHead className="min-w-[150px] text-base font-semibold py-4 px-4">User</TableHead>
                    <TableHead className="min-w-[150px] max-w-[200px] text-base font-semibold py-4 px-4">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-base whitespace-nowrap py-4 px-4">
                        <div className="flex flex-col">
                          <span>{format(new Date(tx.timestamp), 'PP')}</span>
                          <span className="text-sm text-muted-foreground">{format(new Date(tx.timestamp), 'p')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-base whitespace-nowrap py-4 px-4">{tx.product?.name}</TableCell>
                      <TableCell className="text-base whitespace-nowrap py-4 px-4">{getTypeBadge(tx.type)}</TableCell>
                      <TableCell className="text-base whitespace-nowrap py-4 px-4">{tx.quantity}</TableCell>
                      <TableCell className="text-base break-words py-4 px-4">
                        <div className="break-words whitespace-normal">{getFromDisplay(tx)}</div>
                      </TableCell>
                      <TableCell className="text-base break-words py-4 px-4">
                        <div className="break-words whitespace-normal">{getToDisplay(tx)}</div>
                      </TableCell>
                      <TableCell className="text-base py-4 px-4">
                        {tx.user ? (
                          <div className="text-base">
                            <div className="font-medium whitespace-nowrap">{tx.user.name}</div>
                            <div className="text-muted-foreground text-sm truncate max-w-[150px]">{tx.user.email}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-base max-w-[200px] break-words py-4 px-4" title={tx.reason || '-'}>
                        <div className="break-words whitespace-normal">{tx.reason || '-'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredTransactions.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <div className="text-base text-muted-foreground whitespace-nowrap">
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

