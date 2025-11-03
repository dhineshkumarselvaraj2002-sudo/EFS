"use client"

import { TrendingUp } from "lucide-react"
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

export const description = "A multiple line chart"

const chartConfig = {
  stockIn: {
    label: "Stock In",
    color: "var(--chart-1)",
  },
  stockOut: {
    label: "Stock Out",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartLineMultiple() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['analytics-transactions'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/transactions?period=6m')
      if (!res.ok) throw new Error('Failed to fetch transaction data')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Calculate trend
  const calculateTrend = () => {
    if (!chartData || chartData.length < 2) return 0
    const recent = chartData.slice(-1)[0]
    const previous = chartData.slice(-2)[0]
    if (!previous || previous.stockIn === 0) return 0
    const change = ((recent.stockIn - previous.stockIn) / previous.stockIn) * 100
    return Math.round(change * 10) / 10
  }

  const trend = calculateTrend()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock In/Out Trends</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
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
          <CardTitle>Stock In/Out Trends</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No transaction data available
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock In/Out Trends</CardTitle>
        <CardDescription>Last 6 months</CardDescription>
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
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="stockIn"
              type="monotone"
              stroke="var(--color-stockIn)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="stockOut"
              type="monotone"
              stroke="var(--color-stockOut)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {trend > 0 ? (
                <>Trending up by {Math.abs(trend)}% <TrendingUp className="h-4 w-4" /></>
              ) : trend < 0 ? (
                <>Trending down by {Math.abs(trend)}% <TrendingUp className="h-4 w-4 rotate-180" /></>
              ) : (
                <>No significant change</>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Showing stock movements for the last 6 months
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

