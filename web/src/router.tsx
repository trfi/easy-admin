import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { LoginPage } from '@/auth/LoginPage'
import { RequireAuth } from '@/auth/guard'
import { OverviewPage } from '@/modules/overview/OverviewPage'
import { UsersPage } from '@/modules/users/UsersPage'
import { RevenuePage } from '@/modules/revenue/RevenuePage'
import { AiPage } from '@/modules/ai/AiPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'revenue', element: <RevenuePage /> },
      { path: 'ai', element: <AiPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
