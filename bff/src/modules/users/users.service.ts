import { ObjectId, type Collection, type Document, type Filter } from 'mongodb'
import type { DbHandle } from '../../db/client'
import {
  COLLECTIONS,
  toAdminUserView,
  type AdminUserView,
  type PointTransactionDoc,
  type UserDoc,
} from '../../db/readModels'

export interface UserStatsPoint {
  date: string
  count: number
}

export interface UserStats {
  activeToday: number
  activeYesterday: number
  activeThisMonth: number
  activeLastMonth: number
  newToday: number
  newYesterday: number
  newThisWeek: number
  newLastWeek: number
  newThisMonth: number
  newLastMonth: number
  newByDay: UserStatsPoint[]
  activeByDay: UserStatsPoint[]
  customActive?: number
  customNew?: number
}

// Pure date helpers — injectable `now` makes them unit-testable.
export function dayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function yesterdayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
}

export function yesterdayEnd(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 1)
}

export function weekStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d
}

export function lastWeekStart(now: Date): Date {
  const currentWeek = weekStart(now)
  return new Date(currentWeek.getTime() - 7 * 86400000)
}

export function lastWeekEnd(now: Date): Date {
  const currentWeek = weekStart(now)
  return new Date(currentWeek.getTime() - 1)
}

export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function lastMonthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
}

export function lastMonthEnd(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 1)
}

export function daysAgo(now: Date, n: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n))
}

export interface UserSearchOptions {
  q?: string
  page?: number
  limit?: number
}

export interface UserSearchResult {
  users: AdminUserView[]
  page: number
  limit: number
  total: number
}

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 200
const DAILY_FREE_SOURCE = 'daily_free'
const DAILY_TYPE = 'Daily'
const ACTIVE_USER_EXPR = { $ifNull: ['$user', '$userId'] }

// Escape a user-supplied string for safe use inside a RegExp.
// Prevents a search term like "a.*" from being treated as a pattern.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build a Mongo filter for user search. Pure — no DB access.
// Matches the trimmed term against email, username, name, or code (case-insensitive).
export function buildUserSearchFilter(q: string | undefined): Filter<UserDoc> {
  const term = q?.trim()
  if (!term) return {}

  const rx = { $regex: escapeRegex(term), $options: 'i' }
  return { $or: [{ email: rx }, { username: rx }, { name: rx }, { code: rx }] }
}

export function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

export function clampPage(page: number | undefined): number {
  if (!page || !Number.isFinite(page) || page < 1) return 1
  return Math.floor(page)
}

export function buildActiveUserMatch(since: Date, until?: Date): Filter<PointTransactionDoc> {
  const range: Record<string, Date> = { $gte: since }
  if (until) range.$lte = until
  return {
    createdAt: range,
    source: { $ne: DAILY_FREE_SOURCE },
    'metadata.source': { $ne: DAILY_FREE_SOURCE },
    type: { $ne: DAILY_TYPE },
    reason: { $ne: DAILY_FREE_SOURCE },
  } as Filter<PointTransactionDoc>
}

export function buildActiveUserCountPipeline(since: Date, until?: Date): Document[] {
  return [
    { $match: buildActiveUserMatch(since, until) },
    { $group: { _id: ACTIVE_USER_EXPR } },
    { $match: { _id: { $ne: null } } },
    { $count: 'count' },
  ]
}

export function buildActiveUsersByDayPipeline(since: Date, until?: Date): Document[] {
  return [
    { $match: buildActiveUserMatch(since, until) },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          user: ACTIVE_USER_EXPR,
        },
      },
    },
    { $match: { '_id.user': { $ne: null } } },
    { $group: { _id: '$_id.date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]
}

export async function countActiveUsers(
  collection: Collection<PointTransactionDoc>,
  since: Date,
  until?: Date
): Promise<number> {
  const [result] = await collection.aggregate<{ count: number }>(buildActiveUserCountPipeline(since, until)).toArray()
  return result?.count ?? 0
}

export async function countNewUsers(
  collection: Collection<UserDoc>,
  since: Date,
  until?: Date
): Promise<number> {
  const range: Record<string, Date> = { $gte: since }
  if (until) range.$lte = until
  return collection.countDocuments({ createdAt: range })
}

export async function searchUsers(
  db: DbHandle,
  options: UserSearchOptions
): Promise<UserSearchResult> {
  const filter = buildUserSearchFilter(options.q)
  const page = clampPage(options.page)
  const limit = clampLimit(options.limit)
  const collection = db.collection<UserDoc>(COLLECTIONS.users)

  const [docs, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ])

  return { users: docs.map(toAdminUserView), page, limit, total }
}

export async function getUserById(db: DbHandle, id: string): Promise<AdminUserView | null> {
  if (!ObjectId.isValid(id)) return null

  const doc = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .findOne({ _id: new ObjectId(id) })

  return doc ? toAdminUserView(doc) : null
}

export interface UserStatsOptions {
  from?: Date
  to?: Date
  days?: number
}

export async function getUserStats(
  db: DbHandle,
  options?: UserStatsOptions,
  now: Date = new Date()
): Promise<UserStats> {
  const usersCollection = db.collection<UserDoc>(COLLECTIONS.users)
  const pointTransactions = db.collection<PointTransactionDoc>(COLLECTIONS.pointTransaction)
  const today = dayStart(now)
  const yStart = yesterdayStart(now)
  const yEnd = yesterdayEnd(now)
  const week = weekStart(now)
  const lwStart = lastWeekStart(now)
  const lwEnd = lastWeekEnd(now)
  const month = monthStart(now)
  const lmStart = lastMonthStart(now)
  const lmEnd = lastMonthEnd(now)

  let chartFrom: Date
  let chartTo: Date | undefined

  if (options?.from) {
    chartFrom = options.from
    chartTo = options.to
  } else {
    const numDays = options?.days && options.days > 0 ? options.days : 30
    chartFrom = daysAgo(now, numDays - 1)
    chartTo = undefined
  }

  const newRangeMatch: Record<string, Date> = { $gte: chartFrom }
  if (chartTo) newRangeMatch.$lte = chartTo

  const isCustomRangeRequested = Boolean(options?.from)

  const [
    activeToday,
    activeYesterday,
    activeThisMonth,
    activeLastMonth,
    newToday,
    newYesterday,
    newThisWeek,
    newLastWeek,
    newThisMonth,
    newLastMonth,
    newByDayRaw,
    activeByDayRaw,
    customActive,
    customNew,
  ] = await Promise.all([
    countActiveUsers(pointTransactions, today),
    countActiveUsers(pointTransactions, yStart, yEnd),
    countActiveUsers(pointTransactions, month),
    countActiveUsers(pointTransactions, lmStart, lmEnd),
    countNewUsers(usersCollection, today),
    countNewUsers(usersCollection, yStart, yEnd),
    countNewUsers(usersCollection, week),
    countNewUsers(usersCollection, lwStart, lwEnd),
    countNewUsers(usersCollection, month),
    countNewUsers(usersCollection, lmStart, lmEnd),
    usersCollection
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: newRangeMatch } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    pointTransactions
      .aggregate<{ _id: string; count: number }>(buildActiveUsersByDayPipeline(chartFrom, chartTo))
      .toArray(),
    isCustomRangeRequested && options?.from ? countActiveUsers(pointTransactions, options.from, options.to) : undefined,
    isCustomRangeRequested && options?.from ? countNewUsers(usersCollection, options.from, options.to) : undefined,
  ])

  return {
    activeToday,
    activeYesterday,
    activeThisMonth,
    activeLastMonth,
    newToday,
    newYesterday,
    newThisWeek,
    newLastWeek,
    newThisMonth,
    newLastMonth,
    newByDay: newByDayRaw.map((r) => ({ date: r._id, count: r.count })),
    activeByDay: activeByDayRaw.map((r) => ({ date: r._id, count: r.count })),
    customActive,
    customNew,
  }
}
