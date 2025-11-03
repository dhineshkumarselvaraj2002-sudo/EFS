'use client'

import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'

interface BatchExpiryBadgeProps {
  expiryDate: Date | string | null
  batchNumber?: string
  variant?: 'compact' | 'detailed'
}

export function BatchExpiryBadge({ expiryDate, batchNumber, variant = 'compact' }: BatchExpiryBadgeProps) {
  if (!expiryDate) {
    return variant === 'detailed' ? (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">No Expiry</Badge>
      </div>
    ) : null
  }

  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline'
  let icon: React.ReactNode = null

  if (daysUntilExpiry < 0) {
    // Expired
    badgeVariant = 'destructive'
    icon = <AlertTriangle className="h-3 w-3" />
  } else if (daysUntilExpiry <= 7) {
    // Expiring within 7 days
    badgeVariant = 'destructive'
    icon = <AlertTriangle className="h-3 w-3" />
  } else if (daysUntilExpiry <= 30) {
    // Expiring within 30 days
    badgeVariant = 'default'
  } else {
    // Not expiring soon
    badgeVariant = 'secondary'
  }

  const formattedDate = format(expiry, 'MMM dd, yyyy')

  if (variant === 'compact') {
    return (
      <Badge variant={badgeVariant} className="flex items-center gap-1">
        {icon}
        {daysUntilExpiry < 0
          ? 'Expired'
          : daysUntilExpiry <= 7
          ? `${daysUntilExpiry}d`
          : formattedDate}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={badgeVariant} className="flex items-center gap-1">
        {icon}
        {daysUntilExpiry < 0
          ? 'Expired'
          : daysUntilExpiry === 0
          ? 'Expires Today'
          : daysUntilExpiry === 1
          ? 'Expires Tomorrow'
          : daysUntilExpiry <= 7
          ? `Expires in ${daysUntilExpiry} days`
          : `Expires: ${formattedDate}`}
      </Badge>
      {batchNumber && (
        <span className="text-xs text-muted-foreground">Batch: {batchNumber}</span>
      )}
    </div>
  )
}

