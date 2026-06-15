import { ObjectId, type Filter } from 'mongodb'
import type { DbHandle } from '../../db/client'
import { COLLECTIONS, toAdminUserView, type AdminUserView, type UserDoc } from '../../db/readModels'

export interface UserSearchOptions {
  q?: string
  limit?: number
}

const DEFAULT_LIMIT = 50
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

export async function searchUsers(
  db: DbHandle,
  options: UserSearchOptions
): Promise<AdminUserView[]> {
  const docs = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .find(buildUserSearchFilter(options.q))
    .sort({ createdAt: -1 })
    .limit(clampLimit(options.limit))
    .toArray()

  return docs.map(toAdminUserView)
}

export async function getUserById(db: DbHandle, id: string): Promise<AdminUserView | null> {
  if (!ObjectId.isValid(id)) return null

  const doc = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .findOne({ _id: new ObjectId(id) })

  return doc ? toAdminUserView(doc) : null
}
