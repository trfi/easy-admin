import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import {
  buildActiveUsersByDayPipeline,
  buildActiveUserCountPipeline,
  buildActiveUserMatch,
  buildUserSearchFilter,
  clampLimit,
  clampPage,
  escapeRegex,
  dayStart,
  yesterdayStart,
  yesterdayEnd,
  weekStart,
  lastWeekStart,
  lastWeekEnd,
  monthStart,
  lastMonthStart,
  lastMonthEnd,
  daysAgo,
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

  it('builds a case-insensitive $or across email/username/name/code', () => {
    const filter = buildUserSearchFilter('alice')
    expect(filter).toEqual({
      $or: [
        { email: { $regex: 'alice', $options: 'i' } },
        { username: { $regex: 'alice', $options: 'i' } },
        { name: { $regex: 'alice', $options: 'i' } },
        { code: { $regex: 'alice', $options: 'i' } },
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
    expect(clampLimit(undefined)).toBe(25)
    expect(clampLimit(0)).toBe(25)
    expect(clampLimit(-5)).toBe(25)
    expect(clampLimit(Number.NaN)).toBe(25)
  })

  it('caps at the maximum', () => {
    expect(clampLimit(1000)).toBe(200)
  })

  it('floors fractional values within range', () => {
    expect(clampLimit(10.9)).toBe(10)
  })
})

describe('clampPage', () => {
  it('defaults to 1 when missing or invalid', () => {
    expect(clampPage(undefined)).toBe(1)
    expect(clampPage(0)).toBe(1)
    expect(clampPage(-2)).toBe(1)
  })

  it('floors fractional pages', () => {
    expect(clampPage(3.7)).toBe(3)
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

  it('maps sourceApp, lastLoginApp, and connectedApps when present', () => {
    const view = toAdminUserView(
      baseDoc({
        sourceApp: 'easyquiz',
        lastLoginApp: 'hepi',
        connectedApps: ['easyquiz', 'hepi'],
      })
    )
    expect(view.sourceApp).toBe('easyquiz')
    expect(view.lastLoginApp).toBe('hepi')
    expect(view.connectedApps).toEqual(['easyquiz', 'hepi'])
  })

  it('defaults connectedApps to [sourceApp] when connectedApps is absent but sourceApp exists', () => {
    const view = toAdminUserView(baseDoc({ sourceApp: 'hepi' }))
    expect(view.sourceApp).toBe('hepi')
    expect(view.connectedApps).toEqual(['hepi'])
  })

  it('defaults connectedApps to empty array when neither exists', () => {
    const view = toAdminUserView(baseDoc())
    expect(view.sourceApp).toBeUndefined()
    expect(view.lastLoginApp).toBeUndefined()
    expect(view.connectedApps).toEqual([])
  })

  it('maps code when present', () => {
    const view = toAdminUserView(baseDoc({ code: 'ABC123' }))
    expect(view.code).toBe('ABC123')
  })
})

describe('active user stats pipelines', () => {
  it('excludes daily free grants from the active-user match', () => {
    const since = new Date('2026-06-19T00:00:00Z')

    expect(buildActiveUserMatch(since)).toEqual({
      createdAt: { $gte: since },
      source: { $ne: 'daily_free' },
      'metadata.source': { $ne: 'daily_free' },
      type: { $ne: 'Daily' },
      reason: { $ne: 'daily_free' },
    })
  })

  it('supports an optional until upper bound', () => {
    const since = new Date('2026-06-10T00:00:00Z')
    const until = new Date('2026-06-15T23:59:59.999Z')

    expect(buildActiveUserMatch(since, until)).toEqual({
      createdAt: { $gte: since, $lte: until },
      source: { $ne: 'daily_free' },
      'metadata.source': { $ne: 'daily_free' },
      type: { $ne: 'Daily' },
      reason: { $ne: 'daily_free' },
    })
  })

  it('counts unique active users since the boundary', () => {
    const since = new Date('2026-06-01T00:00:00Z')

    expect(buildActiveUserCountPipeline(since)).toEqual([
      { $match: buildActiveUserMatch(since) },
      { $group: { _id: { $ifNull: ['$user', '$userId'] } } },
      { $match: { _id: { $ne: null } } },
      { $count: 'count' },
    ])
  })

  it('counts each active user once per day in the 30-day chart', () => {
    const since = new Date('2026-05-21T00:00:00Z')

    expect(buildActiveUsersByDayPipeline(since)).toEqual([
      { $match: buildActiveUserMatch(since) },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            user: { $ifNull: ['$user', '$userId'] },
          },
        },
      },
      { $match: { '_id.user': { $ne: null } } },
      { $group: { _id: '$_id.date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
  })
})

describe('dayStart', () => {
  it('returns midnight UTC of the given date', () => {
    expect(dayStart(new Date('2026-06-16T14:30:00Z'))).toEqual(new Date('2026-06-16T00:00:00Z'))
  })
})

describe('yesterdayStart and yesterdayEnd', () => {
  it('returns yesterday start and end in UTC', () => {
    const now = new Date('2026-06-16T14:30:00Z')
    expect(yesterdayStart(now)).toEqual(new Date('2026-06-15T00:00:00.000Z'))
    expect(yesterdayEnd(now)).toEqual(new Date('2026-06-15T23:59:59.999Z'))
  })
})

describe('weekStart', () => {
  it('returns Monday for a Tuesday', () => {
    // 2026-06-16 is a Tuesday; week starts Monday 2026-06-15
    expect(weekStart(new Date('2026-06-16T00:00:00Z'))).toEqual(new Date('2026-06-15T00:00:00Z'))
  })

  it('returns previous Monday for a Sunday', () => {
    // 2026-06-21 is a Sunday
    expect(weekStart(new Date('2026-06-21T00:00:00Z'))).toEqual(new Date('2026-06-15T00:00:00Z'))
  })

  it('returns itself when the input is Monday', () => {
    expect(weekStart(new Date('2026-06-15T00:00:00Z'))).toEqual(new Date('2026-06-15T00:00:00Z'))
  })
})

describe('lastWeekStart and lastWeekEnd', () => {
  it('returns previous Monday 00:00:00 to Sunday 23:59:59.999 UTC', () => {
    const now = new Date('2026-06-16T14:30:00Z') // Tuesday
    expect(lastWeekStart(now)).toEqual(new Date('2026-06-08T00:00:00.000Z'))
    expect(lastWeekEnd(now)).toEqual(new Date('2026-06-14T23:59:59.999Z'))
  })
})

describe('monthStart', () => {
  it('returns the first of the month at midnight UTC', () => {
    expect(monthStart(new Date('2026-06-16T14:30:00Z'))).toEqual(new Date('2026-06-01T00:00:00Z'))
  })
})

describe('lastMonthStart and lastMonthEnd', () => {
  it('returns previous month 1st to last millisecond of previous month', () => {
    const now = new Date('2026-06-16T14:30:00Z')
    expect(lastMonthStart(now)).toEqual(new Date('2026-05-01T00:00:00.000Z'))
    expect(lastMonthEnd(now)).toEqual(new Date('2026-05-31T23:59:59.999Z'))
  })

  it('handles January roll-over to previous December', () => {
    const janNow = new Date('2026-01-10T10:00:00Z')
    expect(lastMonthStart(janNow)).toEqual(new Date('2025-12-01T00:00:00.000Z'))
    expect(lastMonthEnd(janNow)).toEqual(new Date('2025-12-31T23:59:59.999Z'))
  })
})

describe('daysAgo', () => {
  it('returns midnight UTC N days before the given date', () => {
    const now = new Date('2026-06-16T14:30:00Z')
    expect(daysAgo(now, 1)).toEqual(new Date('2026-06-15T00:00:00Z'))
    expect(daysAgo(now, 29)).toEqual(new Date('2026-05-18T00:00:00Z'))
  })
})

