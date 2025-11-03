"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"

const chartConfig = {
  shortage: {
    label: "Shortage",
    color: "var(--chart-5)",
  },
  currentStock: {
    label: "Current Stock",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function ChartLowStockProducts() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['analytics-low-stock-products'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/low-stock-products')
      if (!res.ok) throw new Error('Failed to fetch low stock products')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Products</CardTitle>
          <CardDescription>Top products requiring restock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px]">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Products</CardTitle>
          <CardDescription>No low stock items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            All products are well stocked
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Low Stock Products
        </CardTitle>
        <CardDescription>Top 10 products below minimum stock level</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="product"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={100}
              tickFormatter={(value) => value.length > 15 ? value.slice(0, 12) + '...' : value}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent />}
              formatter={(value: any) => [`${value} units short`, 'Shortage']}
              labelFormatter={(label) => {
                const item = chartData.find((d: any) => d.product === label)
                return item ? `${item.product}\nCurrent: ${item.currentStock} | Min: ${item.minLevel}` : label
              }}
            />
            <Bar
              dataKey="shortage"
              fill="var(--color-shortage)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

