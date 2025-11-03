'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  warehouses: 'Warehouses',
  inventory: 'Inventory',
  transactions: 'Transactions',
  suppliers: 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  alerts: 'Alerts',
  settings: 'Settings',
}

export function PageBreadcrumb() {
  const pathname = usePathname()
  
  // Split pathname into segments
  const segments = pathname.split('/').filter(Boolean)
  
  // Don't show breadcrumb on root dashboard page only
  if (segments.length === 1 && segments[0] === 'dashboard') {
    return null
  }

  // Filter out 'dashboard' from segments and build breadcrumb items
  const filteredSegments = segments.filter(seg => seg !== 'dashboard')
  
  // Build breadcrumb items
  const items = filteredSegments.map((segment, index) => {
    const isLast = index === filteredSegments.length - 1
    // Always include 'dashboard' in href
    const href = '/dashboard/' + filteredSegments.slice(0, index + 1).join('/')
    const label = routeLabels[segment] || segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    return { segment, href, label, isLast }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item) => (
          <React.Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

