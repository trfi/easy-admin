import { describe, it, expect, vi } from 'vitest'
import type { Config } from '../../config'
import {
  validateAdjust,
  adjustPoints,
  AdjustValidationError,
  AdjustUpstreamError,
  MAX_ADJUSTMENT,
  type AdjustRequest,
} from './adjust.service'

const VALID_ID = '507f1f77bcf86cd799439011'

function makeConfig(): Config {
  return {
    mongoUri: 'mongodb://localhost:27017/test',
    jwtSecret: 'secret',
    adminUsername: 'admin',
    adminPassword: 'pw',
    serviceKey: 'svc-key-123',
    easyApiUrl: 'https://api.example.test',
    usdToVndRate: 26309,
    port: 3010,
  }
}

describe('validateAdjust', () => {
  it('accepts a valid permanent adjustment', () => {
    const req = validateAdjust({ userId: VALID_ID, amount: 100, mode: 'permanent', reason: 'comp' })
    expect(req).toEqual({ userId: VALID_ID, amount: 100, mode: 'permanent', reason: 'comp' })
  })

  it('trims the reason', () => {
    const req = validateAdjust({ userId: VALID_ID, amount: 1, mode: 'permanent', reason: '  hi  ' })
    expect(req.reason).toBe('hi')
  })

  it('rejects an invalid ObjectId', () => {
    expect(() => validateAdjust({ userId: 'nope', amount: 1, mode: 'permanent', reason: 'r' })).toThrow(
      AdjustValidationError
    )
  })

  it('rejects non-positive or non-finite amounts', () => {
    for (const amount of [0, -5, Number.NaN, Infinity, '10']) {
      expect(() =>
        validateAdjust({ userId: VALID_ID, amount, mode: 'permanent', reason: 'r' })
      ).toThrow(AdjustValidationError)
    }
  })

  it('rejects amounts over the cap', () => {
    expect(() =>
      validateAdjust({ userId: VALID_ID, amount: MAX_ADJUSTMENT + 1, mode: 'permanent', reason: 'r' })
    ).toThrow(/exceed/)
  })

  it('rejects an unknown mode', () => {
    expect(() =>
      validateAdjust({ userId: VALID_ID, amount: 1, mode: 'deduct', reason: 'r' })
    ).toThrow(AdjustValidationError)
  })

  it('rejects an empty reason', () => {
    expect(() =>
      validateAdjust({ userId: VALID_ID, amount: 1, mode: 'permanent', reason: '   ' })
    ).toThrow(AdjustValidationError)
  })

  it('requires a valid expiresAt for expiring mode', () => {
    expect(() =>
      validateAdjust({ userId: VALID_ID, amount: 1, mode: 'expiring', reason: 'r' })
    ).toThrow(/expiresAt/)
    expect(() =>
      validateAdjust({ userId: VALID_ID, amount: 1, mode: 'expiring', reason: 'r', expiresAt: 'bad' })
    ).toThrow(/expiresAt/)
  })

  it('accepts expiring mode with a valid expiresAt', () => {
    const req = validateAdjust({
      userId: VALID_ID,
      amount: 1,
      mode: 'expiring',
      reason: 'r',
      expiresAt: '2026-12-31T00:00:00.000Z',
    })
    expect(req.expiresAt).toBe('2026-12-31T00:00:00.000Z')
  })
})

describe('adjustPoints proxy', () => {
  const req: AdjustRequest = { userId: VALID_ID, amount: 100, mode: 'permanent', reason: 'comp' }

  it('calls the EasyQuiz endpoint with the service key and correct shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ newBalance: { recurring: 5, permanent: 105, total: 110 } }),
    })

    const result = await adjustPoints(req, makeConfig(), fetchMock as unknown as typeof fetch)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`https://api.example.test/user/${VALID_ID}/points/adjust`)
    expect(init.method).toBe('POST')
    expect(init.headers['X-Service-Key']).toBe('svc-key-123')
    expect(JSON.parse(init.body)).toEqual({ amount: 100, mode: 'permanent', reason: 'comp' })
    expect(result.newBalance.total).toBe(110)
  })

  it('includes expiresAt only for expiring mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ newBalance: { recurring: 0, permanent: 0, total: 0 } }),
    })

    await adjustPoints(
      { ...req, mode: 'expiring', expiresAt: '2026-12-31T00:00:00.000Z' },
      makeConfig(),
      fetchMock as unknown as typeof fetch
    )

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body)
    expect(body.expiresAt).toBe('2026-12-31T00:00:00.000Z')
  })

  it('propagates an upstream error with its status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'User not found' }),
    })

    await expect(
      adjustPoints(req, makeConfig(), fetchMock as unknown as typeof fetch)
    ).rejects.toMatchObject({ status: 404, message: 'User not found' })
  })

  it('raises AdjustUpstreamError on a non-JSON error body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json')
      },
    })

    await expect(
      adjustPoints(req, makeConfig(), fetchMock as unknown as typeof fetch)
    ).rejects.toBeInstanceOf(AdjustUpstreamError)
  })
})
