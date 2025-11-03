'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'

interface LowStockItem {
  productId: string
  productName: string
  warehouseName?: string
  currentQuantity: number
  minStockLevel: number
}

export function LowStockAlert() {
  const { data: lowStockItems } = useQuery<LowStockItem[]>({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts/low-stock')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 30000, // Check every 30 seconds
  })

  // Show toast notifications for new low stock items
  useEffect(() => {
    if (lowStockItems && lowStockItems.length > 0) {
      lowStockItems.forEach((item) => {
        const message = item.warehouseName
          ? `${item.productName} in ${item.warehouseName}: ${item.currentQuantity} units (min: ${item.minStockLevel})`
          : `${item.productName}: ${item.currentQuantity} units (min: ${item.minStockLevel})`

        toast.warning('Low Stock Alert', {
          description: message,
          duration: 5000,
        })
      })
    }
  }, [lowStockItems])

  if (!lowStockItems || lowStockItems.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lowStockItems.slice(0, 5).map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between p-2 rounded-lg border bg-destructive/10"
            >
              <div className="flex-1">
                <p className="font-medium">{item.productName}</p>
                {item.warehouseName && (
                  <p className="text-sm text-muted-foreground">{item.warehouseName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">
                  {item.currentQuantity} / {item.minStockLevel}
                </Badge>
              </div>
            </div>
          ))}
          {lowStockItems.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              +{lowStockItems.length - 5} more items with low stock
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

