import { Outlet, Link, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { ThemeToggle } from '@/theme/ThemeToggle'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export function Layout() {
  const { pathname } = useLocation()
  
  // Clean breadcrumbs display based on current route
  let pageTitle = 'Overview'
  if (pathname === '/users') pageTitle = 'Users'
  else if (pathname === '/revenue') pageTitle = 'Revenue'
  else if (pathname === '/ai') pageTitle = 'AI Management'

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:inline-flex">
                    <BreadcrumbLink asChild>
                      <Link to="/">Dashboard</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathname !== '/' && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                  {pathname === '/' && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Overview</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
