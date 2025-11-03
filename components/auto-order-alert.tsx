'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, X } from 'lucide-react'
import Link from 'next/link'

interface AutoOrderAlertProps {
  purchaseOrder: {
    id: string
    product: {
      name: string
      sku: string
    }
    supplier: {
      name: string
    }
    quantity: number
    status: string
  }
  onDismiss?: () => void
}

export function AutoOrderAlert({ purchaseOrder, onDismiss }: AutoOrderAlertProps) {
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="flex items-center justify-between">
        <span className="text-blue-900 dark:text-blue-100">
          Auto-Generated Purchase Order
        </span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2 text-blue-800 dark:text-blue-200">
        <p>
          A purchase order was automatically generated for <strong>{purchaseOrder.product.name}</strong> ({purchaseOrder.product.sku}).
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
            {purchaseOrder.quantity} units
          </Badge>
          <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
            Supplier: {purchaseOrder.supplier.name}
          </Badge>
          <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
            Status: {purchaseOrder.status}
          </Badge>
        </div>
        <div className="pt-2">
          <Link href="/dashboard/purchase-orders">
            <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900">
              View Purchase Orders
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  )
}

