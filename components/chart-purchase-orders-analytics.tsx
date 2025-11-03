"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Pie, PieChart, Cell, Legend } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { ShoppingCart, Package, TrendingUp } from "lucide-react"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28']

export function ChartPurchaseOrdersAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-purchase-orders-summary', 90],
    queryFn: async () => {
      const res = await fetch('/api/analytics/purchase-orders-summary?days=90')
      if (!res.ok) throw new Error('Failed to fetch purchase orders summary')
      return res.json()
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders Analytics</CardTitle>
          <CardDescription>Order patterns and status</CardDescription>
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
          <CardTitle>Purchase Orders Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalOrders || 0}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalQuantity || 0}</div>
              <div className="text-sm text-muted-foreground">Total Quantity</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {data.ordersByStatus?.find((o: any) => o.status === 'PENDING')?.count || 0}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Package className="h-4 w-4" />
                Pending
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders by Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders by Status
          </CardTitle>
          <CardDescription>Last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.ordersByStatus || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {(data.ordersByStatus || []).map((_: any, index: number) => (
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

      {/* Top Products by Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Products by Order Quantity
          </CardTitle>
          <CardDescription>Most ordered items</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.ordersByProduct || []).slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="product" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={10}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

