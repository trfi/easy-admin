import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </TooltipProvider>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}
