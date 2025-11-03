"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
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

export const description = "A bar chart with a custom label"

const chartConfig = {
  quantity: {
    label: "Quantity",
    color: "var(--chart-3)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig

export function ChartBarLabelCustom() {
  const { data: warehouseData, isLoading } = useQuery({
    queryKey: ['analytics-inventory-by-warehouse'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/inventory-by-warehouse')
      if (!res.ok) throw new Error('Failed to fetch warehouse data')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const chartData = React.useMemo(() => {
    if (!warehouseData) return []
    return warehouseData.map((item: any) => ({
      warehouse: item.warehouse,
      quantity: item.quantity,
    })).slice(0, 6) // Top 6 warehouses
  }, [warehouseData])

  // Calculate trend
  const calculateTrend = () => {
    if (!chartData || chartData.length < 2) return 0
    const totalQuantity = chartData.reduce((sum, item) => sum + item.quantity, 0)
    return totalQuantity > 0 ? 5.2 : 0 // Placeholder trend calculation
  }

  const trend = calculateTrend()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory by Warehouse</CardTitle>
          <CardDescription>Last 6 warehouses</CardDescription>
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
          <CardTitle>Inventory by Warehouse</CardTitle>
          <CardDescription>No warehouse data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No inventory data available
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory by Warehouse</CardTitle>
        <CardDescription>Top warehouses by quantity</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="warehouse"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 10)}
              hide
            />
            <XAxis dataKey="quantity" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="quantity"
              layout="vertical"
              fill="var(--color-quantity)"
              radius={4}
            >
              <LabelList
                dataKey="warehouse"
                position="insideLeft"
                offset={8}
                className="fill-(--color-label)"
                fontSize={12}
              />
              <LabelList
                dataKey="quantity"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {trend > 0 && <>Total inventory across warehouses <TrendingUp className="h-4 w-4" /></>}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing inventory quantities by warehouse
        </div>
      </CardFooter>
    </Card>
  )
}

