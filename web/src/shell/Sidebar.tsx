import { NavLink } from 'react-router-dom'
import { MODULES } from './registry'
import { cn } from '@/lib/utils'

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-6 font-semibold">Easy-Admin</div>
      <nav className="flex-1 space-y-1 p-3">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <NavLink
              key={m.id}
              to={m.path}
              end={m.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
