import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import {
  buildUserSearchFilter,
  clampLimit,
  escapeRegex,
} from './users.service'
import { toAdminUserView, type UserDoc } from '../../db/readModels'

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.*b')).toBe('a\\.\\*b')
    expect(escapeRegex('c++')).toBe('c\\+\\+')
    expect(escapeRegex('(x)')).toBe('\\(x\\)')
  })

  it('leaves plain text untouched', () => {
    expect(escapeRegex('alice@example.com')).toBe('alice@example\\.com')
    expect(escapeRegex('bob')).toBe('bob')
  })
})

describe('buildUserSearchFilter', () => {
  it('returns an empty filter for blank/undefined query', () => {
    expect(buildUserSearchFilter(undefined)).toEqual({})
    expect(buildUserSearchFilter('')).toEqual({})
    expect(buildUserSearchFilter('   ')).toEqual({})
  })

  it('builds a case-insensitive $or across email/username/name', () => {
    const filter = buildUserSearchFilter('alice')
    expect(filter).toEqual({
      $or: [
        { email: { $regex: 'alice', $options: 'i' } },
        { username: { $regex: 'alice', $options: 'i' } },
        { name: { $regex: 'alice', $options: 'i' } },
      ],
    })
  })

  it('trims the term and escapes regex metacharacters', () => {
    const filter = buildUserSearchFilter('  a.*  ') as { $or: [{ email: { $regex: string } }] }
    expect(filter.$or[0].email.$regex).toBe('a\\.\\*')
  })
})

describe('clampLimit', () => {
  it('defaults when missing or invalid', () => {
    expect(clampLimit(undefined)).toBe(50)
    expect(clampLimit(0)).toBe(50)
    expect(clampLimit(-5)).toBe(50)
    expect(clampLimit(Number.NaN)).toBe(50)
  })

  it('caps at the maximum', () => {
    expect(clampLimit(1000)).toBe(200)
  })

  it('floors fractional values within range', () => {
    expect(clampLimit(10.9)).toBe(10)
  })
})

describe('toAdminUserView', () => {
  function baseDoc(overrides: Partial<UserDoc> = {}): UserDoc {
    return {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      email: 'alice@example.com',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-02-01'),
      ...overrides,
    }
  }

  it('maps _id to a hex string and defaults role to User', () => {
    const view = toAdminUserView(baseDoc())
    expect(view._id).toBe('507f1f77bcf86cd799439011')
    expect(view.role).toBe('User')
  })

  it('derives points.total when not stored', () => {
    const view = toAdminUserView(baseDoc({ points: { recurring: 10, permanent: 5 } }))
    expect(view.points.total).toBe(15)
  })

  it('uses stored points.total when present', () => {
    const view = toAdminUserView(
      baseDoc({ points: { recurring: 10, permanent: 5, total: 99 } })
    )
    expect(view.points.total).toBe(99)
  })

  it('zeroes points when the field is absent', () => {
    const view = toAdminUserView(baseDoc())
    expect(view.points).toMatchObject({ recurring: 0, permanent: 0, total: 0 })
  })

  it('defaults avatar to null', () => {
    expect(toAdminUserView(baseDoc()).avatar).toBeNull()
  })
})
