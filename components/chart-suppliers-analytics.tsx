"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { Users, ShoppingCart, CheckCircle } from "lucide-react"

export function ChartSuppliersAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/suppliers')
      if (!res.ok) throw new Error('Failed to fetch suppliers analytics')
      return res.json()
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suppliers Analytics</CardTitle>
          <CardDescription>Supplier performance and activity</CardDescription>
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
          <CardTitle>Suppliers Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalSuppliers || 0}</div>
              <div className="text-sm text-muted-foreground">Total Suppliers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.suppliersWithProducts || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                With Products
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.suppliersWithOrders || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <ShoppingCart className="h-4 w-4" />
                With Orders
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {data.supplierStats?.reduce((sum: number, s: any) => sum + s.totalOrders, 0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Suppliers by Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Top Suppliers by Orders
          </CardTitle>
          <CardDescription>Most active suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.topSuppliers || []).slice(0, 5)}>
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
                <Bar dataKey="totalOrders" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Suppliers by Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Suppliers by Completion Rate
          </CardTitle>
          <CardDescription>Order fulfillment performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.suppliersByPerformance || []).slice(0, 5)}>
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
                <Bar dataKey="completionRate" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

