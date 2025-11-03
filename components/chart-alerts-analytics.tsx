"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Pie, PieChart, Cell, Legend } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { Bell, AlertTriangle, Calendar } from "lucide-react"

const COLORS = ['#FF8042', '#FFBB28', '#00C49F']

export function ChartAlertsAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-alerts-summary', 30],
    queryFn: async () => {
      const res = await fetch('/api/analytics/alerts-summary?days=30')
      if (!res.ok) throw new Error('Failed to fetch alerts summary')
      return res.json()
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts Analytics</CardTitle>
          <CardDescription>Alert trends and distribution</CardDescription>
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
          <CardTitle>Alerts Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.totalAlerts || 0}</div>
              <div className="text-sm text-muted-foreground">Total Alerts</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-destructive">{data.newAlerts || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                New Stock Alerts
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{data.newExpiryAlerts || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Calendar className="h-4 w-4" />
                New Expiry Alerts
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.stockAlertsCount || 0}</div>
              <div className="text-sm text-muted-foreground">Stock Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts by Type
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { type: 'Stock Alerts', count: data.stockAlertsCount || 0 },
                    { type: 'Expiry Alerts', count: data.expiryAlertsCount || 0 },
                  ]}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  <Cell fill="#FF8042" />
                  <Cell fill="#FFBB28" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Products by Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top Products by Alerts
          </CardTitle>
          <CardDescription>Products with most alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.alertsByProduct || []).slice(0, 5)}>
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
                <Bar dataKey="count" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

