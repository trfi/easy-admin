import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import { COLLECTIONS, type UserDoc } from '../../db/readModels'
import { getRevenueSummary, type RevenueSummary } from '../revenue/revenue.service'
import { listProviders } from '../ai/ai.service'
import type { AiProviderView } from '../ai/ai.types'

export interface AiHealth {
  total: number
  active: number
  disabled: number
}

export interface OverviewResult {
  revenueThisMonth: RevenueSummary
  activeUsers: number
  aiHealth: AiHealth
}

const ACTIVE_WINDOW_DAYS = 30

// First instant of the current month (UTC). Pure.
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

// Threshold date for "active": now minus N days. Pure.
export function activeSince(now: Date, days: number = ACTIVE_WINDOW_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

// Summarize providers into total/active/disabled. Pure.
export function summarizeAiHealth(providers: Pick<AiProviderView, 'active'>[]): AiHealth {
  let active = 0
  for (const p of providers) {
    if (p.active) active += 1
  }
  return { total: providers.length, active, disabled: providers.length - active }
}

// DB-touching orchestration. Composes existing services — no new business logic.
// AI health proxies to Hepi (provider config), so a Hepi outage must not take the
// whole overview down: fall back to a zeroed AiHealth on failure.
export async function getOverview(
  db: DbHandle,
  config: Config,
  now: Date = new Date()
): Promise<OverviewResult> {
  const [revenue, activeUsers, aiHealth] = await Promise.all([
    getRevenueSummary(db, { from: monthStart(now) }, config.usdToVndRate),
    db
      .collection<UserDoc>(COLLECTIONS.users)
      .countDocuments({ updatedAt: { $gte: activeSince(now) } }),
    listProviders(config)
      .then(summarizeAiHealth)
      .catch(() => ({ total: 0, active: 0, disabled: 0 }) satisfies AiHealth),
  ])

  return {
    revenueThisMonth: revenue,
    activeUsers,
    aiHealth,
  }
}

