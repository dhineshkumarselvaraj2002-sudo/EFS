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
  count: {
    label: "Orders",
    color: "var(--chart-5)",
  },
  quantity: {
    label: "Quantity",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function ChartPurchaseOrdersStatus() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['analytics-purchase-orders-status'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/purchase-orders-status')
      if (!res.ok) throw new Error('Failed to fetch purchase orders status')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders by Status</CardTitle>
          <CardDescription>Current distribution</CardDescription>
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
          <CardTitle>Purchase Orders by Status</CardTitle>
          <CardDescription>No purchase orders data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No purchase orders available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders by Status</CardTitle>
        <CardDescription>Distribution of purchase orders</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="status"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.charAt(0) + value.slice(1).toLowerCase()}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

