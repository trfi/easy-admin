import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/shell/AppShell'
import { MODULES } from '@/shell/registry'
import { LoginPage } from '@/auth/LoginPage'
import { RequireAuth } from '@/auth/guard'

// Router is derived from the registry — no per-module route wiring.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: MODULES.map((m) => ({
      index: m.path === '/',
      path: m.path === '/' ? undefined : m.path.replace(/^\//, ''),
      Component: m.element,
    })),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
