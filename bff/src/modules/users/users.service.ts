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
  activeThisMonth: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
  newByDay: UserStatsPoint[]
  activeByDay: UserStatsPoint[]
}

// Pure date helpers — injectable `now` makes them unit-testable.
export function dayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function weekStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d
}

export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
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
// Matches the trimmed term against email, username, or name (case-insensitive).
export function buildUserSearchFilter(q: string | undefined): Filter<UserDoc> {
  const term = q?.trim()
  if (!term) return {}

  const rx = { $regex: escapeRegex(term), $options: 'i' }
  return { $or: [{ email: rx }, { username: rx }, { name: rx }] }
}

export function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

export function clampPage(page: number | undefined): number {
  if (!page || !Number.isFinite(page) || page < 1) return 1
  return Math.floor(page)
}

export function buildActiveUserMatch(since: Date): Filter<PointTransactionDoc> {
  return {
    createdAt: { $gte: since },
    source: { $ne: DAILY_FREE_SOURCE },
    'metadata.source': { $ne: DAILY_FREE_SOURCE },
    type: { $ne: DAILY_TYPE },
    reason: { $ne: DAILY_FREE_SOURCE },
  } as Filter<PointTransactionDoc>
}

export function buildActiveUserCountPipeline(since: Date): Document[] {
  return [
    { $match: buildActiveUserMatch(since) },
    { $group: { _id: ACTIVE_USER_EXPR } },
    { $match: { _id: { $ne: null } } },
    { $count: 'count' },
  ]
}

export function buildActiveUsersByDayPipeline(since: Date): Document[] {
  return [
    { $match: buildActiveUserMatch(since) },
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

async function countActiveUsers(
  collection: Collection<PointTransactionDoc>,
  since: Date
): Promise<number> {
  const [result] = await collection.aggregate<{ count: number }>(buildActiveUserCountPipeline(since)).toArray()
  return result?.count ?? 0
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

export async function getUserStats(db: DbHandle, now: Date = new Date()): Promise<UserStats> {
  const usersCollection = db.collection<UserDoc>(COLLECTIONS.users)
  const pointTransactions = db.collection<PointTransactionDoc>(COLLECTIONS.pointTransaction)
  const today = dayStart(now)
  const week = weekStart(now)
  const month = monthStart(now)
  const thirtyDaysAgo = daysAgo(now, 29)

  const [activeToday, activeThisMonth, newToday, newThisWeek, newThisMonth, newByDayRaw, activeByDayRaw] =
    await Promise.all([
      countActiveUsers(pointTransactions, today),
      countActiveUsers(pointTransactions, month),
      usersCollection.countDocuments({ createdAt: { $gte: today } }),
      usersCollection.countDocuments({ createdAt: { $gte: week } }),
      usersCollection.countDocuments({ createdAt: { $gte: month } }),
      usersCollection
        .aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      pointTransactions
        .aggregate<{ _id: string; count: number }>(buildActiveUsersByDayPipeline(thirtyDaysAgo))
        .toArray(),
    ])

  return {
    activeToday,
    activeThisMonth,
    newToday,
    newThisWeek,
    newThisMonth,
    newByDay: newByDayRaw.map((r) => ({ date: r._id, count: r.count })),
    activeByDay: activeByDayRaw.map((r) => ({ date: r._id, count: r.count })),
  }
}
