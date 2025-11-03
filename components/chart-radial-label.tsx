"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { LabelList, RadialBar, RadialBarChart } from "recharts"
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

export const description = "A radial chart with a label"

export function ChartRadialLabel() {
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
    return warehouseData
      .slice(0, 5) // Top 5 warehouses
      .map((item: any, index: number) => ({
        warehouse: item.warehouse,
        quantity: item.quantity,
        fill: `var(--color-warehouse-${index + 1})`,
      }))
  }, [warehouseData])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      quantity: {
        label: "Quantity",
      },
    }
    chartData.forEach((item, index) => {
      config[`warehouse-${index + 1}`] = {
        label: item.warehouse,
        color: `var(--chart-${(index % 5) + 1})`,
      }
    })
    return config
  }, [chartData])

  const totalQuantity = React.useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.quantity, 0)
  }, [chartData])

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Warehouse Inventory</CardTitle>
          <CardDescription>Top warehouses</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-[250px]">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Warehouse Inventory</CardTitle>
          <CardDescription>No warehouse data available</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No warehouse inventory data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Warehouse Inventory</CardTitle>
        <CardDescription>Top 5 warehouses by quantity</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={-90}
            endAngle={380}
            innerRadius={30}
            outerRadius={110}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="warehouse" />}
            />
            <RadialBar dataKey="quantity" background>
              <LabelList
                position="insideStart"
                dataKey="warehouse"
                className="fill-white capitalize mix-blend-luminosity"
                fontSize={11}
              />
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total: {totalQuantity.toLocaleString()} units <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing inventory by warehouse
        </div>
      </CardFooter>
    </Card>
  )
}
