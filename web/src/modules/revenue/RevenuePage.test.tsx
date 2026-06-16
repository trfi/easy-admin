import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RevenuePage } from './RevenuePage'
import type { RevenueResponse, RevenueSeriesResponse } from './revenue.api'

const RESPONSE: RevenueResponse = {
  rows: [
    {
      _id: 'p1',
      userId: 'u1',
      amount: 50000,
      currency: 'VND',
      date: '2026-06-01T00:00:00.000Z',
      type: 'Deposit',
      reason: 'Subscription',
      status: 'Completed',
      paymentGateway: 'Bank',
      paymentName: 'VCB Transfer',
      payer: { userId: 'u1', name: 'Alice', email: 'alice@example.com' },
    },
  ],
  summary: { byCurrency: { VND: 50000, USD: 12 }, unifiedVnd: 365708, count: 1 },
  page: 1,
  limit: 25,
  total: 1,
}

const SERIES: RevenueSeriesResponse = {
  series: [{ period: '2026-06', unifiedVnd: 365708, VND: 50000, USD: 12, count: 1 }],
  interval: 'month',
}

function jsonFor(url: string) {
  if (url.includes('/revenue/series')) return SERIES
  return RESPONSE
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RevenuePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RevenuePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.setItem('easy-admin-token', 'test-token')
    vi.spyOn(global, 'fetch').mockImplementation((input) =>
      Promise.resolve(new Response(JSON.stringify(jsonFor(String(input))), { status: 200 }))
    )
  })

  it('renders summary totals and a payment row with payer', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('VCB Transfer')).toBeInTheDocument())
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    // Unified VND total appears in the summary card.
    expect(screen.getByText(/365[.,]708/)).toBeInTheDocument()
  })

  it('does not send a status filter on initial load', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    renderPage()
    await waitFor(() => expect(screen.getByText('VCB Transfer')).toBeInTheDocument())

    const listUrls = fetchSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes('/revenue') && !u.includes('/series'))
    expect(listUrls.some((u) => u.includes('status='))).toBe(false)
  })
})
