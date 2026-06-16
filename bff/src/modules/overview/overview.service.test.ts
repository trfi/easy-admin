import { describe, it, expect } from 'vitest'
import { monthStart, activeSince, summarizeAiHealth } from './overview.service'

describe('monthStart', () => {
  it('returns the first instant of the current month in UTC', () => {
    const now = new Date('2026-06-15T13:45:30.000Z')
    expect(monthStart(now).toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('handles January', () => {
    const now = new Date('2026-01-31T23:59:59.999Z')
    expect(monthStart(now).toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('handles December', () => {
    const now = new Date('2026-12-01T00:00:00.000Z')
    expect(monthStart(now).toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })
})

describe('activeSince', () => {
  it('subtracts the default 30-day window', () => {
    const now = new Date('2026-06-15T00:00:00.000Z')
    expect(activeSince(now).toISOString()).toBe('2026-05-16T00:00:00.000Z')
  })

  it('subtracts a custom window', () => {
    const now = new Date('2026-06-15T00:00:00.000Z')
    expect(activeSince(now, 7).toISOString()).toBe('2026-06-08T00:00:00.000Z')
  })
})

describe('summarizeAiHealth', () => {
  function status(active: boolean): { active: boolean } {
    return { active }
  }

  it('counts total, active, and disabled', () => {
    const result = summarizeAiHealth([status(true), status(true), status(false)])
    expect(result).toEqual({ total: 3, active: 2, disabled: 1 })
  })

  it('handles an empty list', () => {
    expect(summarizeAiHealth([])).toEqual({ total: 0, active: 0, disabled: 0 })
  })

  it('handles all-disabled', () => {
    expect(summarizeAiHealth([status(false), status(false)])).toEqual({
      total: 2,
      active: 0,
      disabled: 2,
    })
  })
})
