import { ObjectId, type Filter } from 'mongodb'
import type { DbHandle } from '../../db/client'
import { COLLECTIONS, toAdminUserView, type AdminUserView, type UserDoc } from '../../db/readModels'

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
  const collection = db.collection<UserDoc>(COLLECTIONS.users)
  const today = dayStart(now)
  const week = weekStart(now)
  const month = monthStart(now)
  const thirtyDaysAgo = daysAgo(now, 29)

  const [activeToday, activeThisMonth, newToday, newThisWeek, newThisMonth, newByDayRaw, activeByDayRaw] =
    await Promise.all([
      collection.countDocuments({ updatedAt: { $gte: today } }),
      collection.countDocuments({ updatedAt: { $gte: month } }),
      collection.countDocuments({ createdAt: { $gte: today } }),
      collection.countDocuments({ createdAt: { $gte: week } }),
      collection.countDocuments({ createdAt: { $gte: month } }),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { updatedAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
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
