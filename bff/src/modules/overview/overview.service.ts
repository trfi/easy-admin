import type { DbHandle } from '../../db/client'
import { COLLECTIONS, type AiProviderStatusDoc, type UserDoc } from '../../db/readModels'
import { getRevenue, type RevenueSummary } from '../revenue/revenue.service'
import { listStatus } from '../ai/ai.service'

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

// Summarize provider status rows into total/active/disabled. Pure.
export function summarizeAiHealth(statuses: AiProviderStatusDoc[]): AiHealth {
  let active = 0
  for (const s of statuses) {
    if (s.active) active += 1
  }
  return { total: statuses.length, active, disabled: statuses.length - active }
}

// DB-touching orchestration. Composes existing services — no new business logic.
export async function getOverview(
  db: DbHandle,
  rate: number,
  now: Date = new Date()
): Promise<OverviewResult> {
  const [revenue, activeUsers, statuses] = await Promise.all([
    getRevenue(db, { from: monthStart(now) }, rate),
    db
      .collection<UserDoc>(COLLECTIONS.users)
      .countDocuments({ updatedAt: { $gte: activeSince(now) } }),
    listStatus(db),
  ])

  return {
    revenueThisMonth: revenue.summary,
    activeUsers,
    aiHealth: summarizeAiHealth(statuses),
  }
}
