"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart, Sector } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
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
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export const description = "An interactive pie chart"

export function ChartPieInteractive() {
  const id = "pie-interactive"
  
  const { data: categoryData, isLoading } = useQuery({
    queryKey: ['analytics-product-distribution'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/product-distribution')
      if (!res.ok) throw new Error('Failed to fetch product distribution')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const chartData = React.useMemo(() => {
    if (!categoryData) return []
    return categoryData.map((item: any, index: number) => ({
      category: item.category,
      quantity: item.quantity,
      fill: `var(--color-category-${index + 1})`,
    }))
  }, [categoryData])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      quantity: {
        label: "Quantity",
      },
    }
    chartData.forEach((item, index) => {
      config[`category-${index + 1}`] = {
        label: item.category,
        color: `var(--chart-${(index % 5) + 1})`,
      }
    })
    return config
  }, [chartData])

  const [activeCategory, setActiveCategory] = React.useState(
    chartData.length > 0 ? chartData[0].category : ''
  )

  React.useEffect(() => {
    if (chartData.length > 0 && !activeCategory) {
      setActiveCategory(chartData[0].category)
    }
  }, [chartData, activeCategory])

  const activeIndex = React.useMemo(
    () => chartData.findIndex((item) => item.category === activeCategory),
    [activeCategory, chartData]
  )
  
  const categories = React.useMemo(() => chartData.map((item) => item.category), [chartData])

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-start space-y-0 pb-0">
          <div className="grid gap-1">
            <CardTitle>Product Distribution</CardTitle>
            <CardDescription>By category</CardDescription>
          </div>
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
        <CardHeader className="flex-row items-start space-y-0 pb-0">
          <div className="grid gap-1">
            <CardTitle>Product Distribution</CardTitle>
            <CardDescription>No category data available</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No product distribution data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>Product Distribution</CardTitle>
          <CardDescription>By category</CardDescription>
        </div>
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger
            className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
            aria-label="Select a category"
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {categories.map((category) => {
              const item = chartData.find((d) => d.category === category)
              if (!item) return null
              return (
                <SelectItem
                  key={category}
                  value={category}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-xs"
                      style={{
                        backgroundColor: item.fill,
                      }}
                    />
                    {category}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="category" />}
            />
            <Pie
              data={chartData}
              dataKey="quantity"
              nameKey="category"
              innerRadius={60}
              outerRadius={110}
              strokeWidth={5}
              activeIndex={activeIndex >= 0 ? activeIndex : undefined}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox && activeIndex >= 0) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {chartData[activeIndex]?.quantity.toLocaleString() || 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {chartData[activeIndex]?.category || 'Units'}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total: {chartData.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()} units
        </div>
        <div className="text-muted-foreground leading-none">
          Showing inventory distribution by product category
        </div>
      </CardFooter>
    </Card>
  )
}
