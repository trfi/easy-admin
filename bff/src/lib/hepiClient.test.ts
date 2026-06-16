import { describe, expect, it, vi } from 'vitest'
import { hepiRequest, HepiUpstreamError } from './hepiClient'
import type { Config } from '../config'

const config = {
  hepiApiUrl: 'https://api.hepi.cc',
  adminSecret: 'secret-123',
} as Config

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Typed fetch stub so mock.calls carries [url, init] tuples under noUncheckedIndexedAccess.
function stubFetch(response: () => Response) {
  return vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(response()))
}

describe('hepiRequest', () => {
  it('attaches the admin secret and target URL', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }))
    await hepiRequest({ method: 'GET', path: '/ai-models/providers' }, config, fetchImpl as unknown as typeof fetch)

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.hepi.cc/ai-models/providers',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-Admin-Secret': 'secret-123' }),
      })
    )
  })

  it('serializes the body for writes', async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ provider: {} }))
    await hepiRequest(
      { method: 'POST', path: '/ai-models/providers', body: { providerId: 'x' } },
      config,
      fetchImpl as unknown as typeof fetch
    )

    const init = fetchImpl.mock.calls[0]?.[1]
    expect(init?.body).toBe(JSON.stringify({ providerId: 'x' }))
  })

  it('omits the body entirely for a bodyless GET', async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ ok: true }))
    await hepiRequest({ method: 'GET', path: '/ai-models' }, config, fetchImpl as unknown as typeof fetch)

    const init = fetchImpl.mock.calls[0]?.[1] ?? {}
    expect('body' in init).toBe(false)
  })

  it('returns the parsed JSON on success', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ providers: [{ providerId: 'a' }] }))
    const result = await hepiRequest<{ providers: unknown[] }>(
      { method: 'GET', path: '/ai-models/providers' },
      config,
      fetchImpl as unknown as typeof fetch
    )
    expect(result.providers).toHaveLength(1)
  })

  it('throws HepiUpstreamError carrying the upstream status, message, and code', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: 'Provider already exists', code: 'AI_PROVIDER_CONFIG_ALREADY_EXISTS' }, 409)
    )

    await expect(
      hepiRequest({ method: 'POST', path: '/ai-models/providers' }, config, fetchImpl as unknown as typeof fetch)
    ).rejects.toMatchObject({
      name: 'HepiUpstreamError',
      status: 409,
      message: 'Provider already exists',
      code: 'AI_PROVIDER_CONFIG_ALREADY_EXISTS',
    })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('gateway timeout', { status: 504 }))
    await expect(
      hepiRequest({ method: 'GET', path: '/ai-models' }, config, fetchImpl as unknown as typeof fetch)
    ).rejects.toThrow(/Hepi request failed \(504\)/)
  })

  it('returns undefined for a 204 No Content', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    const result = await hepiRequest(
      { method: 'DELETE', path: '/ai-models/providers/x' },
      config,
      fetchImpl as unknown as typeof fetch
    )
    expect(result).toBeUndefined()
  })

  it('HepiUpstreamError is an Error subclass', () => {
    expect(new HepiUpstreamError(500, 'boom')).toBeInstanceOf(Error)
  })
})
