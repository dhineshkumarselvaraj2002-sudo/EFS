"use client"

import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  stock: {
    label: "Stock Alerts",
    color: "var(--chart-3)",
  },
  expiry: {
    label: "Expiry Alerts",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function ChartAlertsTrend() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['analytics-alerts-trend'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/alerts-trend?days=30')
      if (!res.ok) throw new Error('Failed to fetch alerts trend')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const totalStock = React.useMemo(() => {
    if (!chartData) return 0
    return chartData.reduce((sum: number, item: any) => sum + item.stock, 0)
  }, [chartData])

  const totalExpiry = React.useMemo(() => {
    if (!chartData) return 0
    return chartData.reduce((sum: number, item: any) => sum + item.expiry, 0)
  }, [chartData])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts Trend</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
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
          <CardTitle>Alerts Trend</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No alerts data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts Trend</CardTitle>
        <CardDescription>Stock and expiry alerts over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="stock"
              type="monotone"
              stroke="var(--color-stock)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="expiry"
              type="monotone"
              stroke="var(--color-expiry)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2 flex-1">
            <div className="flex items-center gap-2 leading-none">
              <span className="text-muted-foreground">Stock Alerts:</span>
              <span className="font-medium">{totalStock}</span>
            </div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-muted-foreground">Expiry Alerts:</span>
              <span className="font-medium">{totalExpiry}</span>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

