'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-react'
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

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: expiryAlerts } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/expiry-alerts')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const markAsRead = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'stock' | 'expiry' }) => {
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
      // Optimistically update the correct query based on alert type
      if (variables.type === 'stock') {
        queryClient.setQueryData(['alerts'], (oldData: any) => {
          if (!oldData) return oldData
          return oldData.map((alert: any) =>
            alert.id === variables.id ? { ...alert, status: 'READ' } : alert
          )
        })
      } else {
        queryClient.setQueryData(['expiry-alerts'], (oldData: any) => {
          if (!oldData) return oldData
          return oldData.map((alert: any) =>
            alert.id === variables.id ? { ...alert, status: 'READ' } : alert
          )
        })
      }
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] })
      toast.success('Notification marked as read')
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread} new
            </Badge>
          )}
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
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {alert.type === 'stock' 
                            ? alert.product?.name 
                            : alert.batch?.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
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
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleMarkAsRead(e, alert.id, alert.type)}
                          disabled={markAsRead.isPending}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
        {recentAlerts.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              className="w-full justify-center text-xs"
              onClick={() => router.push('/dashboard/alerts')}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

