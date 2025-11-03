"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"

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
  batches: {
    label: "Batches",
    color: "var(--chart-4)",
  },
  quantity: {
    label: "Quantity",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

export function ChartExpiringBatches() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['analytics-expiring-batches-timeline'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/expiring-batches-timeline')
      if (!res.ok) throw new Error('Failed to fetch expiring batches')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const totalBatches = React.useMemo(() => {
    if (!chartData) return 0
    return chartData.reduce((sum: number, item: any) => sum + item.batches, 0)
  }, [chartData])

  const urgentBatches = React.useMemo(() => {
    if (!chartData) return 0
    const urgent = chartData.find((item: any) => item.period === '0-7 days')
    return urgent?.batches || 0
  }, [chartData])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expiring Batches Timeline</CardTitle>
          <CardDescription>Batches expiring in next 90 days</CardDescription>
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
          <CardTitle>Expiring Batches Timeline</CardTitle>
          <CardDescription>No expiring batches data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No batches expiring in the next 90 days
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expiring Batches Timeline</CardTitle>
        <CardDescription>Batches expiring in next 90 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="batches"
              fill="var(--color-batches)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2 flex-1">
            <div className="flex items-center gap-2 leading-none">
              <span className="text-muted-foreground">Total Expiring:</span>
              <span className="font-medium">{totalBatches} batches</span>
            </div>
            {urgentBatches > 0 && (
              <div className="flex items-center gap-2 leading-none text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{urgentBatches} batches expiring in 0-7 days</span>
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

