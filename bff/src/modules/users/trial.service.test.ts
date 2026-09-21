import { describe, it, expect, vi } from 'vitest'
import type { Config } from '../../config'
import {
  activateUserTrial,
  TrialValidationError,
  HepiUpstreamError,
} from './trial.service'

const VALID_ID = '507f1f77bcf86cd799439011'

function makeConfig(): Config {
  return {
    mongoUri: 'mongodb://localhost:27017/test',
    jwtSecret: 'secret',
    adminUsername: 'admin',
    adminPassword: 'pw',
    adminSecret: 'admin-secret-123',
    easyApiUrl: 'https://api.example.test',
    hepiApiUrl: 'https://hepi.example.test',
    usdToVndRate: 26309,
    port: 3010,
  }
}

describe('activateUserTrial validation', () => {
  it('rejects an empty or whitespace user ID', async () => {
    await expect(activateUserTrial('', makeConfig())).rejects.toThrow(TrialValidationError)
    await expect(activateUserTrial('   ', makeConfig())).rejects.toThrow(TrialValidationError)
  })

  it('rejects an invalid ObjectId', async () => {
    await expect(activateUserTrial('invalid-id', makeConfig())).rejects.toThrow(TrialValidationError)
    await expect(activateUserTrial('12345', makeConfig())).rejects.toThrow(TrialValidationError)
  })
})

describe('activateUserTrial proxy', () => {
  it('calls Hepi /user/activate-trial with admin secret and identifier', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Premium trial activated successfully',
        data: {
          plan: { name: 'Premium', isTrial: true },
          pointsAdded: 200,
        },
      }),
    })

    const result = await activateUserTrial(
      `  ${VALID_ID}  `,
      makeConfig(),
      fetchMock as unknown as typeof fetch
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://hepi.example.test/user/activate-trial')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Admin-Secret']).toBe('admin-secret-123')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ identifier: VALID_ID })
    expect(result.success).toBe(true)
    expect(result.data?.pointsAdded).toBe(200)
  })

  it('propagates upstream error status and message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'User not found' }),
    })

    await expect(
      activateUserTrial(VALID_ID, makeConfig(), fetchMock as unknown as typeof fetch)
    ).rejects.toMatchObject({
      status: 404,
      message: 'User not found',
    })
  })

  it('handles non-JSON upstream failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('Bad gateway')
      },
    })

    await expect(
      activateUserTrial(VALID_ID, makeConfig(), fetchMock as unknown as typeof fetch)
    ).rejects.toBeInstanceOf(HepiUpstreamError)
  })
})
