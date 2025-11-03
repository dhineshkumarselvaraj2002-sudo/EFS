"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Pie, PieChart, Cell, Legend } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { Package, AlertTriangle, TrendingDown } from "lucide-react"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

export function ChartInventoryAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/inventory')
      if (!res.ok) throw new Error('Failed to fetch inventory analytics')
      return res.json()
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Analytics</CardTitle>
          <CardDescription>Inventory distribution and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Summary Stats */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalInventoryEntries || 0}</div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalQuantity || 0}</div>
              <div className="text-sm text-muted-foreground">Total Quantity</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-destructive">{data.lowStockCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Low Stock
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{data.outOfStockCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Out of Stock
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory by Category
          </CardTitle>
          <CardDescription>Quantity distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.inventoryByCategory || []).slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={10}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Inventory by Warehouse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory by Warehouse
          </CardTitle>
          <CardDescription>Distribution across warehouses</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(data.inventoryByWarehouse || []).slice(0, 6)}
                  dataKey="totalQuantity"
                  nameKey="warehouse"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ warehouse, totalQuantity }) => `${warehouse}: ${totalQuantity}`}
                >
                  {(data.inventoryByWarehouse || []).slice(0, 6).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

