"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import {
  Package,
  Warehouse,
  Users,
  PackageSearch,
  ArrowLeftRight,
  Bell,
  ShoppingCart,
  LayoutDashboard,
  Settings,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, getUserAvatarUrl } from '@/lib/utils/user-helpers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

const navSections = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Inventory Management",
    items: [
      {
        title: "Products",
        url: "/dashboard/products",
        icon: Package,
      },
      {
        title: "Warehouses",
        url: "/dashboard/warehouses",
        icon: Warehouse,
      },
      {
        title: "Inventory",
        url: "/dashboard/inventory",
        icon: PackageSearch,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Transactions",
        url: "/dashboard/transactions",
        icon: ArrowLeftRight,
      },
      {
        title: "Purchase Orders",
        url: "/dashboard/purchase-orders",
        icon: ShoppingCart,
      },
      {
        title: "Suppliers",
        url: "/dashboard/suppliers",
        icon: Users,
      },
    ],
  },
  {
    label: "Alerts & Notifications",
    items: [
      {
        title: "Alerts",
        url: "/dashboard/alerts",
        icon: Bell,
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <Package className="!size-6" />
                <span className="text-lg md:text-xl font-semibold">Inventory System</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section, sectionIndex) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-base font-semibold mb-3 mt-2">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive} className="text-base py-2.5 px-3">
                        <Link href={item.url} className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span className="text-base">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="space-y-2">
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-base py-2.5 px-3">
              <Link href="/dashboard/settings" className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                <span className="text-base">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          {session?.user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={async () => {
                  toast.success('Logout successful')
                  setTimeout(() => {
                    signOut({ callbackUrl: '/login' })
                  }, 2000)
                }}
                className="text-destructive text-base py-2.5 px-3"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-base">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {session?.user && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={getUserAvatarUrl(session.user.email, (session.user as any).image)} 
                        alt={session.user.name || 'User'} 
                      />
                      <AvatarFallback>
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-foreground truncate text-sm">{session.user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{session.user.email}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1.5">
                      <p className="text-base font-medium leading-none">{session.user.name}</p>
                      <p className="text-sm leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-base py-2.5">
                    <Link href="/dashboard/settings" className="cursor-pointer flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      toast.success('Logout successful')
                      setTimeout(() => {
                        signOut({ callbackUrl: '/login' })
                      }, 2000)
                    }}
                    className="text-destructive cursor-pointer text-base py-2.5"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
