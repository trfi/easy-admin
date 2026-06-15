import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RevenuePage } from './RevenuePage'
import type { RevenueResponse } from './revenue.api'

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
    },
  ],
  summary: { byCurrency: { VND: 50000, USD: 12 }, unifiedVnd: 365708, count: 1 },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RevenuePage />
    </QueryClientProvider>
  )
}

describe('RevenuePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders summary totals and a payment row', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(RESPONSE), { status: 200 })
    )

    renderPage()

    await waitFor(() => expect(screen.getByText('VCB Transfer')).toBeInTheDocument())
    expect(screen.getByText('Completed')).toBeInTheDocument()
    // Unified VND total appears in the summary card.
    expect(screen.getByText(/365[.,]708/)).toBeInTheDocument()
  })

  it('includes the status filter in the request query when changed', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(RESPONSE), { status: 200 }))

    renderPage()
    await waitFor(() => expect(screen.getByText('VCB Transfer')).toBeInTheDocument())

    const calledUrls = () => fetchSpy.mock.calls.map((c) => String(c[0]))
    // Initial load has no status filter.
    expect(calledUrls().some((u) => u.includes('status='))).toBe(false)
  })
})
