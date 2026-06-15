import type { Filter } from 'mongodb'
import type { DbHandle } from '../../db/client'
import {
  COLLECTIONS,
  toPaymentView,
  type Currency,
  type PaymentDoc,
  type PaymentView,
} from '../../db/readModels'

export interface RevenueFilter {
  status?: 'Pending' | 'Completed' | 'Failed'
  currency?: Currency
  gateway?: 'Bank' | 'Wallet' | 'Card'
  from?: Date
  to?: Date
}

export interface RevenueTotals {
  VND: number
  USD: number
}

export interface RevenueSummary {
  byCurrency: RevenueTotals
  unifiedVnd: number
  count: number
}

export interface RevenueResult {
  rows: PaymentView[]
  summary: RevenueSummary
}

const EMPTY_TOTALS: RevenueTotals = { VND: 0, USD: 0 }

// Build a Mongo filter for the payment-history collection from request query.
// Pure — no DB access, so it is unit-testable.
export function buildRevenueFilter(filter: RevenueFilter): Filter<PaymentDoc> {
  const query: Filter<PaymentDoc> = {}

  if (filter.status) query.status = filter.status
  if (filter.currency) query.currency = filter.currency
  if (filter.gateway) query.paymentGateway = filter.gateway

  if (filter.from || filter.to) {
    const range: Record<string, Date> = {}
    if (filter.from) range.$gte = filter.from
    if (filter.to) range.$lte = filter.to
    query.date = range
  }

  return query
}

// Sum payment amounts split by currency. Pure — operates on an array.
export function summarizeRevenue(payments: PaymentView[], rate: number): RevenueSummary {
  const byCurrency: RevenueTotals = { ...EMPTY_TOTALS }

  for (const p of payments) {
    byCurrency[p.currency] += p.amount
  }

  return {
    byCurrency,
    unifiedVnd: toUnifiedVnd(byCurrency, rate),
    count: payments.length,
  }
}

// Convert per-currency totals to a single VND figure at the configured rate.
// Pure — the conversion rule lives here and nowhere else.
export function toUnifiedVnd(totals: RevenueTotals, rate: number): number {
  return Math.round(totals.VND + totals.USD * rate)
}

// DB-touching orchestration. Reads payment-history ONLY (never point-transaction — TTL).
export async function getRevenue(
  db: DbHandle,
  filter: RevenueFilter,
  rate: number
): Promise<RevenueResult> {
  const docs = await db
    .collection<PaymentDoc>(COLLECTIONS.paymentHistory)
    .find(buildRevenueFilter(filter))
    .sort({ date: -1 })
    .toArray()

  const rows = docs.map(toPaymentView)
  return { rows, summary: summarizeRevenue(rows, rate) }
}
