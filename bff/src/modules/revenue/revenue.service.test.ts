import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import {
  buildRevenueFilter,
  clampLimit,
  clampPage,
  collapseSeries,
  summarizeGroups,
  toUnifiedVnd,
  monthStart,
  todayStart,
  type CurrencyGroup,
  type RevenueFilter,
} from './revenue.service'

const RATE = 26309

describe('toUnifiedVnd', () => {
  it('returns VND unchanged when there is no USD', () => {
    expect(toUnifiedVnd({ VND: 50000, USD: 0 }, RATE)).toBe(50000)
  })

  it('converts USD at the configured rate and adds to VND', () => {
    expect(toUnifiedVnd({ VND: 1000, USD: 2 }, RATE)).toBe(1000 + 2 * RATE)
  })

  it('rounds the result to an integer', () => {
    expect(toUnifiedVnd({ VND: 0, USD: 1.5 }, RATE)).toBe(Math.round(1.5 * RATE))
  })

  it('handles all-zero totals', () => {
    expect(toUnifiedVnd({ VND: 0, USD: 0 }, RATE)).toBe(0)
  })
})

describe('summarizeGroups', () => {
  it('splits totals by currency and sums counts', () => {
    const groups: CurrencyGroup[] = [
      { currency: 'VND', total: 1500, count: 2 },
      { currency: 'USD', total: 3, count: 1 },
    ]
    const summary = summarizeGroups(groups, RATE)
    expect(summary.byCurrency).toEqual({ VND: 1500, USD: 3 })
    expect(summary.count).toBe(3)
    expect(summary.unifiedVnd).toBe(1500 + 3 * RATE)
  })

  it('returns zeroed totals for an empty group list', () => {
    expect(summarizeGroups([], RATE)).toEqual({
      byCurrency: { VND: 0, USD: 0 },
      unifiedVnd: 0,
      count: 0,
    })
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

  it('maps a valid userId to an ObjectId on the user field', () => {
    const id = '507f1f77bcf86cd799439011'
    const built = buildRevenueFilter({ userId: id })
    expect(built.user).toBeInstanceOf(ObjectId)
    expect((built.user as ObjectId).toHexString()).toBe(id)
  })

  it('ignores an invalid userId', () => {
    expect(buildRevenueFilter({ userId: 'not-an-id' })).toEqual({})
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

describe('clampPage / clampLimit', () => {
  it('defaults page to 1 and floors fractional pages', () => {
    expect(clampPage(undefined)).toBe(1)
    expect(clampPage(0)).toBe(1)
    expect(clampPage(-3)).toBe(1)
    expect(clampPage(2.9)).toBe(2)
  })

  it('defaults limit and caps at the max', () => {
    expect(clampLimit(undefined)).toBe(25)
    expect(clampLimit(0)).toBe(25)
    expect(clampLimit(50)).toBe(50)
    expect(clampLimit(9999)).toBe(200)
  })
})

describe('collapseSeries', () => {
  it('collapses per-currency rows into one point per period', () => {
    const points = collapseSeries(
      [
        { period: '2026-05', currency: 'VND', total: 1000, count: 2 },
        { period: '2026-05', currency: 'USD', total: 2, count: 1 },
        { period: '2026-06', currency: 'VND', total: 500, count: 1 },
      ],
      RATE
    )
    expect(points).toEqual([
      { period: '2026-05', VND: 1000, USD: 2, unifiedVnd: 1000 + 2 * RATE, count: 3 },
      { period: '2026-06', VND: 500, USD: 0, unifiedVnd: 500, count: 1 },
    ])
  })

  it('sorts periods ascending', () => {
    const points = collapseSeries(
      [
        { period: '2026-06', currency: 'VND', total: 1, count: 1 },
        { period: '2026-01', currency: 'VND', total: 1, count: 1 },
      ],
      RATE
    )
    expect(points.map((p) => p.period)).toEqual(['2026-01', '2026-06'])
  })

  it('returns an empty array for no data', () => {
    expect(collapseSeries([], RATE)).toEqual([])
  })
})

describe('monthStart / todayStart', () => {
  it('returns the first instant of the current month in UTC', () => {
    const d = new Date('2026-06-19T13:56:10Z')
    expect(monthStart(d).toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('returns the first instant of today in UTC', () => {
    const d = new Date('2026-06-19T13:56:10Z')
    expect(todayStart(d).toISOString()).toBe('2026-06-19T00:00:00.000Z')
  })
})
