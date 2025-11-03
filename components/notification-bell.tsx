'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts?limit=1000')
      if (!res.ok) return { alerts: [] }
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: expiryAlertsData } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/expiry-alerts?limit=1000')
      if (!res.ok) return { expiryAlerts: [] }
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Extract arrays from paginated response (handle both old array format and new object format)
  const alerts = Array.isArray(alertsData) ? alertsData : (alertsData?.alerts || [])
  const expiryAlerts = Array.isArray(expiryAlertsData) ? expiryAlertsData : (expiryAlertsData?.expiryAlerts || [])

  const markAsRead = useMutation({
    mutationFn: async ({ id, type, markAll }: { id?: string; type?: 'stock' | 'expiry'; markAll?: boolean }) => {
      if (markAll) {
        // Mark all alerts of both types
        const [stockRes, expiryRes] = await Promise.all([
          fetch('/api/alerts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true, status: 'READ' }),
          }),
          fetch('/api/expiry-alerts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true, status: 'READ' }),
          }),
        ])
        
        if (!stockRes.ok || !expiryRes.ok) {
          const stockError = await stockRes.json().catch(() => ({}))
          const expiryError = await expiryRes.json().catch(() => ({}))
          throw new Error(stockError.error || expiryError.error || 'Failed to mark all alerts as read')
        }
        
        return { stock: await stockRes.json(), expiry: await expiryRes.json() }
      }

      if (!id || !type) {
        throw new Error('Missing required fields')
      }

      const endpoint = type === 'stock' ? '/api/alerts' : '/api/expiry-alerts'
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'READ' }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update alert')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      if (variables.markAll) {
        // Mark all alerts as read in the cache
        queryClient.setQueryData(['alerts'], (oldData: any) => {
          if (!oldData) return oldData
          // Handle both array and object formats
          if (Array.isArray(oldData)) {
            return oldData.map((alert: any) => ({ ...alert, status: 'READ' }))
          }
          return {
            ...oldData,
            alerts: oldData.alerts?.map((alert: any) => ({ ...alert, status: 'READ' })) || []
          }
        })
        queryClient.setQueryData(['expiry-alerts'], (oldData: any) => {
          if (!oldData) return oldData
          // Handle both array and object formats
          if (Array.isArray(oldData)) {
            return oldData.map((alert: any) => ({ ...alert, status: 'READ' }))
          }
          return {
            ...oldData,
            expiryAlerts: oldData.expiryAlerts?.map((alert: any) => ({ ...alert, status: 'READ' })) || []
          }
        })
        toast.success('All notifications marked as read')
      } else {
        // Optimistically update the correct query based on alert type
        if (variables.type === 'stock') {
          queryClient.setQueryData(['alerts'], (oldData: any) => {
            if (!oldData) return oldData
            // Handle both array and object formats
            if (Array.isArray(oldData)) {
              return oldData.map((alert: any) =>
                alert.id === variables.id ? { ...alert, status: 'READ' } : alert
              )
            }
            return {
              ...oldData,
              alerts: oldData.alerts?.map((alert: any) =>
                alert.id === variables.id ? { ...alert, status: 'READ' } : alert
              ) || []
            }
          })
        } else if (variables.type === 'expiry') {
          queryClient.setQueryData(['expiry-alerts'], (oldData: any) => {
            if (!oldData) return oldData
            // Handle both array and object formats
            if (Array.isArray(oldData)) {
              return oldData.map((alert: any) =>
                alert.id === variables.id ? { ...alert, status: 'READ' } : alert
              )
            }
            return {
              ...oldData,
              expiryAlerts: oldData.expiryAlerts?.map((alert: any) =>
                alert.id === variables.id ? { ...alert, status: 'READ' } : alert
              ) || []
            }
          })
        }
        toast.success('Notification marked as read')
      }
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark notification as read')
    },
  })

  const handleMarkAsRead = (e: React.MouseEvent, id: string, type: 'stock' | 'expiry') => {
    e.preventDefault()
    e.stopPropagation()
    markAsRead.mutate({ id, type })
  }

  const unreadAlerts = alerts?.filter((alert: any) => alert.status === 'NEW') || []
  const unreadExpiryAlerts = expiryAlerts?.filter((alert: any) => alert.status === 'NEW') || []
  const totalUnread = unreadAlerts.length + unreadExpiryAlerts.length

  const recentAlerts = [
    ...(unreadAlerts.slice(0, 5).map((alert: any) => ({ ...alert, type: 'stock' as const }))),
    ...(unreadExpiryAlerts.slice(0, 5).map((alert: any) => ({ ...alert, type: 'expiry' as const })))
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-6 w-6" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3 gap-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <>
                <Badge variant="destructive" className="text-xs">
                  {totalUnread} new
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    markAsRead.mutate({ markAll: true })
                  }}
                  disabled={markAsRead.isPending}
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                  Mark all read
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="divide-y">
              {recentAlerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="group relative"
                >
                  <Link
                    href="/dashboard/alerts"
                    className="block px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">
                          {alert.type === 'stock' 
                            ? alert.product?.name 
                            : alert.batch?.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="text-xs">
                          New
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleMarkAsRead(e, alert.id, alert.type)}
                          disabled={markAsRead.isPending}
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-xs"
            onClick={() => router.push('/dashboard/alerts')}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

