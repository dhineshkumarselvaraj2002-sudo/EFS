"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"

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
  totalOrders: {
    label: "Total Orders",
    color: "var(--chart-2)",
  },
  receivedOrders: {
    label: "Received",
    color: "var(--chart-4)",
  },
  pendingOrders: {
    label: "Pending",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

export function ChartSupplierPerformance() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['analytics-supplier-performance'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/supplier-performance')
      if (!res.ok) throw new Error('Failed to fetch supplier performance')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const topSuppliers = React.useMemo(() => {
    if (!chartData) return []
    return chartData.slice(0, 5) // Top 5 suppliers
  }, [chartData])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance</CardTitle>
          <CardDescription>Top suppliers by orders</CardDescription>
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
          <CardTitle>Supplier Performance</CardTitle>
          <CardDescription>No supplier data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No supplier performance data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Performance</CardTitle>
        <CardDescription>Top 5 suppliers by total orders</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={topSuppliers} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="supplier"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.length > 15 ? value.slice(0, 12) + '...' : value}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="totalOrders"
              fill="var(--color-totalOrders)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

