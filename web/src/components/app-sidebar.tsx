"use client"

import * as React from "react"
import {
  LayoutDashboardIcon,
  UsersIcon,
  DollarSignIcon,
  CpuIcon,
  GalleryVerticalEndIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Administrator",
    email: "admin@easy-admin.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Overview",
      url: "/",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Users",
      url: "/users",
      icon: <UsersIcon />,
    },
    {
      title: "Revenue",
      url: "/revenue",
      icon: <DollarSignIcon />,
    },
    {
      title: "AI Management",
      url: "/ai",
      icon: <CpuIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent active:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Easy Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
