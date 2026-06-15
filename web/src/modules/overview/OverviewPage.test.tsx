import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { OverviewPage } from './OverviewPage'

function wrapper(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const OVERVIEW = {
  revenueThisMonth: { byCurrency: { VND: 1_000_000, USD: 50 }, unifiedVnd: 2_315_450, count: 7 },
  activeUsers: 1234,
  aiHealth: { total: 4, active: 3, disabled: 1 },
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.setItem('easy-admin-token', 'test-token')
  })

  it('renders KPI cards from /api/overview', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(OVERVIEW), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )

    render(wrapper(<OverviewPage />))

    await waitFor(() => expect(screen.getByText('Revenue this month')).toBeInTheDocument())
    expect(screen.getByText('Active users (30d)')).toBeInTheDocument()
    expect(screen.getByText('AI provider health')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('1 disabled')).toBeInTheDocument()
  })

  it('links each card into its module', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(OVERVIEW), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )

    render(wrapper(<OverviewPage />))

    await waitFor(() => expect(screen.getByText('Revenue this month')).toBeInTheDocument())
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/revenue')
    expect(hrefs).toContain('/users')
    expect(hrefs).toContain('/ai')
  })
})
