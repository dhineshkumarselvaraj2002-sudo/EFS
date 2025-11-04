'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

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

  // Track which alerts have already been shown to prevent duplicates
  const shownAlertsRef = useRef<Set<string>>(new Set())

  // Show toast notifications for new low stock items
  useEffect(() => {
    if (lowStockItems && lowStockItems.length > 0) {
      lowStockItems.forEach((item) => {
        // Create a unique key for this alert (productId + warehouseId if available)
        const alertKey = item.warehouseName 
          ? `${item.productId}-${item.warehouseName}`
          : item.productId
        
        // Only show toast if we haven't shown this alert before
        if (!shownAlertsRef.current.has(alertKey)) {
          const message = item.warehouseName
            ? `${item.productName} in ${item.warehouseName}: ${item.currentQuantity} units (min: ${item.minStockLevel})`
            : `${item.productName}: ${item.currentQuantity} units (min: ${item.minStockLevel})`

          toast.warning('Low Stock Alert', {
            description: message,
            duration: 5000,
          })
          
          // Mark this alert as shown
          shownAlertsRef.current.add(alertKey)
        }
      })
      
      // Clean up alerts that are no longer in the list (stock has been replenished)
      const currentKeys = new Set(
        lowStockItems.map(item => 
          item.warehouseName 
            ? `${item.productId}-${item.warehouseName}`
            : item.productId
        )
      )
      
      // Remove keys that are no longer in the current list
      shownAlertsRef.current.forEach((key) => {
        if (!currentKeys.has(key)) {
          shownAlertsRef.current.delete(key)
        }
      })
    } else {
      // If no low stock items, clear all shown alerts
      shownAlertsRef.current.clear()
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

