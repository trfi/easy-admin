import { Hono } from 'hono'
import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import type { AppEnv } from '../../app'
import { getRevenue, type RevenueFilter } from './revenue.service'
import type { Currency } from '../../db/readModels'

const STATUSES = ['Pending', 'Completed', 'Failed'] as const
const CURRENCIES: Currency[] = ['VND', 'USD']
const GATEWAYS = ['Bank', 'Wallet', 'Card'] as const

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function revenueRoutes(db: DbHandle, config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.get('/', async (c) => {
    const q = c.req.query()
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
    filter.from = parseDate(q.from)
    filter.to = parseDate(q.to)

    const result = await getRevenue(db, filter, config.usdToVndRate)
    return c.json(result)
  })

  return router
}
