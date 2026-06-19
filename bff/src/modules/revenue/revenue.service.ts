import type { Filter } from 'mongodb'
import { ObjectId } from 'mongodb'
import type { DbHandle } from '../../db/client'
import {
  COLLECTIONS,
  toPaymentView,
  type Currency,
  type PaymentDoc,
  type PaymentView,
  type UserDoc,
} from '../../db/readModels'

export interface RevenueFilter {
  status?: 'Pending' | 'Completed' | 'Failed'
  currency?: Currency
  gateway?: 'Bank' | 'Wallet' | 'Card'
  userId?: string
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

// Minimal payer info joined onto each page row so the UI can show who paid and
// link into the user. Stays a projection — never the full user doc.
export interface PaymentPayer {
  userId: string
  name?: string
  email?: string
}

export interface PaymentRow extends PaymentView {
  payer?: PaymentPayer
}

export interface RevenueResult {
  rows: PaymentRow[]
  summary: RevenueSummary
  todaySummary: RevenueSummary
  thisMonthSummary: RevenueSummary
  page: number
  limit: number
  total: number
}

const EMPTY_TOTALS: RevenueTotals = { VND: 0, USD: 0 }
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 200

// ── Pure helpers (no DB — unit-testable) ──

export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function todayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// Build a Mongo filter for the payment-history collection from request query.
export function buildRevenueFilter(filter: RevenueFilter): Filter<PaymentDoc> {
  const query: Filter<PaymentDoc> = {}

  if (filter.status) query.status = filter.status
  if (filter.currency) query.currency = filter.currency
  if (filter.gateway) query.paymentGateway = filter.gateway
  if (filter.userId && ObjectId.isValid(filter.userId)) {
    query.user = new ObjectId(filter.userId)
  }

  if (filter.from || filter.to) {
    const range: Record<string, Date> = {}
    if (filter.from) range.$gte = filter.from
    if (filter.to) range.$lte = filter.to
    query.date = range
  }

  return query
}

// Convert per-currency totals to a single VND figure at the configured rate.
// The conversion rule lives here and nowhere else.
export function toUnifiedVnd(totals: RevenueTotals, rate: number): number {
  return Math.round(totals.VND + totals.USD * rate)
}

// Assemble a RevenueSummary from a currency-grouped aggregation result. Pure.
export interface CurrencyGroup {
  currency: Currency
  total: number
  count: number
}

export function summarizeGroups(groups: CurrencyGroup[], rate: number): RevenueSummary {
  const byCurrency: RevenueTotals = { ...EMPTY_TOTALS }
  let count = 0
  for (const g of groups) {
    byCurrency[g.currency] += g.total
    count += g.count
  }
  return { byCurrency, unifiedVnd: toUnifiedVnd(byCurrency, rate), count }
}

export function clampPage(page: number | undefined): number {
  if (!page || !Number.isFinite(page) || page < 1) return 1
  return Math.floor(page)
}

export function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

// ── DB-touching orchestration. Reads paymenthistories ONLY (never pointtransactions — TTL). ──

// Summary is computed by a Mongo $group over the FULL filter — never from the
// page rows — so totals stay correct regardless of pagination. Used by both the
// revenue list and the overview's this-month card.
export async function getRevenueSummary(
  db: DbHandle,
  filter: RevenueFilter,
  rate: number
): Promise<RevenueSummary> {
  const groups = await db
    .collection<PaymentDoc>(COLLECTIONS.paymentHistory)
    .aggregate<CurrencyGroup>([
      { $match: buildRevenueFilter(filter) },
      { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, currency: '$_id', total: 1, count: 1 } },
    ])
    .toArray()

  return summarizeGroups(groups, rate)
}

// Batch-fetch payer name/email for a set of payment rows. One query, projection
// only. Returns rows with `payer` attached where the user still exists.
async function attachPayers(db: DbHandle, rows: PaymentView[]): Promise<PaymentRow[]> {
  const ids = [...new Set(rows.map((r) => r.userId))].filter((id) => ObjectId.isValid(id))
  if (ids.length === 0) return rows

  const users = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .project<{ _id: ObjectId; name?: string; email: string }>({ name: 1, email: 1 })
    .toArray()

  const byId = new Map(users.map((u) => [u._id.toHexString(), u]))
  return rows.map((row) => {
    const u = byId.get(row.userId)
    return u ? { ...row, payer: { userId: row.userId, name: u.name, email: u.email } } : row
  })
}

export interface RevenuePageOptions extends RevenueFilter {
  page?: number
  limit?: number
}

// Paginated payment list + full-filter summary + payer enrichment. The summary
// aggregation and the count run over the whole filter; only `rows` is paged.
export async function getRevenue(
  db: DbHandle,
  options: RevenuePageOptions,
  rate: number,
  now: Date = new Date()
): Promise<RevenueResult> {
  const { page: rawPage, limit: rawLimit, ...filter } = options
  const page = clampPage(rawPage)
  const limit = clampLimit(rawLimit)
  const mongoFilter = buildRevenueFilter(filter)
  const collection = db.collection<PaymentDoc>(COLLECTIONS.paymentHistory)

  const { from: _, to: __, ...baseFilter } = filter
  const todayFilter: RevenueFilter = {
    ...baseFilter,
    status: baseFilter.status || 'Completed',
    from: todayStart(now),
  }
  const thisMonthFilter: RevenueFilter = {
    ...baseFilter,
    status: baseFilter.status || 'Completed',
    from: monthStart(now),
  }

  const [docs, total, summary, todaySummary, thisMonthSummary] = await Promise.all([
    collection
      .find(mongoFilter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(mongoFilter),
    getRevenueSummary(db, filter, rate),
    getRevenueSummary(db, todayFilter, rate),
    getRevenueSummary(db, thisMonthFilter, rate),
  ])

  const rows = await attachPayers(db, docs.map(toPaymentView))
  return { rows, summary, todaySummary, thisMonthSummary, page, limit, total }
}

// ── Time series for charts ──
export type SeriesInterval = 'day' | 'month'

export interface RevenuePoint {
  period: string // 'YYYY-MM-DD' (day) or 'YYYY-MM' (month)
  unifiedVnd: number
  VND: number
  USD: number
  count: number
}

// Group completed deposits into a unified-VND time series. The per-bucket VND
// conversion uses the same rate as everywhere else.
export async function getRevenueSeries(
  db: DbHandle,
  filter: RevenueFilter,
  interval: SeriesInterval,
  rate: number
): Promise<RevenuePoint[]> {
  const format = interval === 'month' ? '%Y-%m' : '%Y-%m-%d'

  const raw = await db
    .collection<PaymentDoc>(COLLECTIONS.paymentHistory)
    .aggregate<{ period: string; currency: Currency; total: number; count: number }>([
      { $match: buildRevenueFilter(filter) },
      {
        $group: {
          _id: { period: { $dateToString: { format, date: '$date' } }, currency: '$currency' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, period: '$_id.period', currency: '$_id.currency', total: 1, count: 1 } },
      { $sort: { period: 1 } },
    ])
    .toArray()

  return collapseSeries(raw, rate)
}

// Collapse per-currency rows into one point per period. Pure — unit-testable.
export function collapseSeries(
  raw: { period: string; currency: Currency; total: number; count: number }[],
  rate: number
): RevenuePoint[] {
  const byPeriod = new Map<string, RevenuePoint>()
  for (const r of raw) {
    let point = byPeriod.get(r.period)
    if (!point) {
      point = { period: r.period, unifiedVnd: 0, VND: 0, USD: 0, count: 0 }
      byPeriod.set(r.period, point)
    }
    point[r.currency] += r.total
    point.count += r.count
  }
  for (const point of byPeriod.values()) {
    point.unifiedVnd = toUnifiedVnd({ VND: point.VND, USD: point.USD }, rate)
  }
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period))
}
