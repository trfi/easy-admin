import { Hono } from 'hono'
import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import type { AppEnv } from '../../app'
import {
  getRevenue,
  getRevenueSeries,
  type RevenueFilter,
  type RevenuePageOptions,
  type SeriesInterval,
} from './revenue.service'
import type { Currency } from '../../db/readModels'

const STATUSES = ['Pending', 'Completed', 'Failed'] as const
const CURRENCIES: Currency[] = ['VND', 'USD']
const GATEWAYS = ['Bank', 'Wallet', 'Card'] as const

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function parseInt_(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

// Shared filter parsing for both the list and series endpoints.
function parseFilter(q: Record<string, string>): RevenueFilter {
  const filter: RevenueFilter = {}
  if (q.status && STATUSES.includes(q.status as (typeof STATUSES)[number])) {
    filter.status = q.status as RevenueFilter['status']
  }
  if (q.currency && CURRENCIES.includes(q.currency as Currency)) {
    filter.currency = q.currency as Currency
  }
  if (q.gateway && GATEWAYS.includes(q.gateway as (typeof GATEWAYS)[number])) {
    filter.gateway = q.gateway as RevenueFilter['gateway']
  }
  if (q.userId) filter.userId = q.userId
  filter.from = parseDate(q.from)
  filter.to = parseDate(q.to)
  return filter
}

export function revenueRoutes(db: DbHandle, config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.get('/', async (c) => {
    const q = c.req.query()
    const options: RevenuePageOptions = {
      ...parseFilter(q),
      page: parseInt_(q.page),
      limit: parseInt_(q.limit),
    }
    const result = await getRevenue(db, options, config.usdToVndRate)
    return c.json(result)
  })

  router.get('/series', async (c) => {
    const q = c.req.query()
    const interval: SeriesInterval = q.interval === 'day' ? 'day' : 'month'
    const series = await getRevenueSeries(db, parseFilter(q), interval, config.usdToVndRate)
    return c.json({ series, interval })
  })

  return router
}
