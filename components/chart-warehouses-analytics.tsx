"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { Warehouse, MapPin, Package } from "lucide-react"

export function ChartWarehousesAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/warehouses')
      if (!res.ok) throw new Error('Failed to fetch warehouses analytics')
      return res.json()
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Warehouses Analytics</CardTitle>
          <CardDescription>Warehouse utilization and performance</CardDescription>
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
          <CardTitle>Warehouses Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalWarehouses || 0}</div>
              <div className="text-sm text-muted-foreground">Total Warehouses</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalCapacity || 0}</div>
              <div className="text-sm text-muted-foreground">Total Capacity</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {data.avgUtilization ? Math.round(data.avgUtilization) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Utilization</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {data.warehouseStats?.reduce((sum: number, w: any) => sum + w.lowStockItems, 0) || 0}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Package className="h-4 w-4" />
                Low Stock Items
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Warehouses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Top Warehouses by Capacity
          </CardTitle>
          <CardDescription>Highest inventory levels</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.topWarehouses || []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={10}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Warehouse Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Warehouse Performance
          </CardTitle>
          <CardDescription>Key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.topWarehouses || []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={10}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalProducts" fill="#0088FE" name="Products" />
                <Bar dataKey="totalBatches" fill="#FFBB28" name="Batches" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

