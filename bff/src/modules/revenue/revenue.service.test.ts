import { describe, expect, it } from 'vitest'
import {
  buildRevenueFilter,
  summarizeRevenue,
  toUnifiedVnd,
  type RevenueFilter,
} from './revenue.service'
import type { PaymentView } from '../../db/readModels'

function payment(overrides: Partial<PaymentView> = {}): PaymentView {
  return {
    _id: '000000000000000000000000',
    userId: '111111111111111111111111',
    amount: 1000,
    currency: 'VND',
    date: new Date('2026-06-01T00:00:00Z'),
    type: 'Deposit',
    reason: 'Top-up',
    status: 'Completed',
    paymentGateway: 'Bank',
    paymentName: 'test',
    ...overrides,
  }
}

const RATE = 26309

describe('toUnifiedVnd', () => {
  it('returns VND unchanged when there is no USD', () => {
    expect(toUnifiedVnd({ VND: 50000, USD: 0 }, RATE)).toBe(50000)
  })

  it('converts USD at the configured rate and adds to VND', () => {
    expect(toUnifiedVnd({ VND: 1000, USD: 2 }, RATE)).toBe(1000 + 2 * RATE)
  })

  it('rounds the result to an integer', () => {
    expect(toUnifiedVnd({ VND: 0, USD: 1.5 }, 26309)).toBe(Math.round(1.5 * 26309))
  })

  it('handles all-zero totals', () => {
    expect(toUnifiedVnd({ VND: 0, USD: 0 }, RATE)).toBe(0)
  })
})

describe('summarizeRevenue', () => {
  it('splits totals by currency', () => {
    const summary = summarizeRevenue(
      [
        payment({ currency: 'VND', amount: 1000 }),
        payment({ currency: 'VND', amount: 500 }),
        payment({ currency: 'USD', amount: 3 }),
      ],
      RATE
    )
    expect(summary.byCurrency).toEqual({ VND: 1500, USD: 3 })
    expect(summary.count).toBe(3)
  })

  it('computes unifiedVnd from the split totals', () => {
    const summary = summarizeRevenue(
      [payment({ currency: 'VND', amount: 1000 }), payment({ currency: 'USD', amount: 2 })],
      RATE
    )
    expect(summary.unifiedVnd).toBe(1000 + 2 * RATE)
  })

  it('returns zeroed totals for an empty list', () => {
    const summary = summarizeRevenue([], RATE)
    expect(summary).toEqual({ byCurrency: { VND: 0, USD: 0 }, unifiedVnd: 0, count: 0 })
  })
})

describe('buildRevenueFilter', () => {
  it('returns an empty filter when nothing is set', () => {
    expect(buildRevenueFilter({})).toEqual({})
  })

  it('maps status/currency/gateway to the right fields', () => {
    const filter: RevenueFilter = { status: 'Completed', currency: 'USD', gateway: 'Card' }
    expect(buildRevenueFilter(filter)).toEqual({
      status: 'Completed',
      currency: 'USD',
      paymentGateway: 'Card',
    })
  })

  it('builds a date range with both bounds', () => {
    const from = new Date('2026-01-01')
    const to = new Date('2026-02-01')
    expect(buildRevenueFilter({ from, to })).toEqual({ date: { $gte: from, $lte: to } })
  })

  it('builds a date range with only a lower bound', () => {
    const from = new Date('2026-01-01')
    expect(buildRevenueFilter({ from })).toEqual({ date: { $gte: from } })
  })

  it('builds a date range with only an upper bound', () => {
    const to = new Date('2026-02-01')
    expect(buildRevenueFilter({ to })).toEqual({ date: { $lte: to } })
  })
})
