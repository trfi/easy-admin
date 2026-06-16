import type { ComponentType } from 'react'
import { LayoutDashboard, DollarSign, Users, Cpu, type LucideIcon } from 'lucide-react'
import { OverviewPage } from '@/modules/overview/OverviewPage'
import { RevenuePage } from '@/modules/revenue/RevenuePage'
import { UsersPage } from '@/modules/users/UsersPage'
import { AiPage } from '@/modules/ai/AiPage'

export interface AdminModule {
  id: string
  label: string
  icon: LucideIcon
  path: string
  element: ComponentType
}

// ── The extensibility spine ──
// Sidebar nav and router are both derived from this array. Adding a module is one
// entry here + one folder under modules/ — no edits to Sidebar, AppShell, or router.
export const MODULES: AdminModule[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/', element: OverviewPage },
  { id: 'users', label: 'Users', icon: Users, path: '/users', element: UsersPage },
  { id: 'revenue', label: 'Revenue', icon: DollarSign, path: '/revenue', element: RevenuePage },
  { id: 'ai', label: 'AI Management', icon: Cpu, path: '/ai', element: AiPage },
]
