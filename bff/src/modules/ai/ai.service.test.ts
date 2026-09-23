import { describe, expect, it, vi } from 'vitest'
import type { Config } from '../../config'
import { resetModelFailures, toModelDefaultsView, toProviderView, toSelectableModelView } from './ai.service'

// Hepi already strips apiKey server-side, but R3 says the BFF must be the place a
// provider object becomes a client view — and it must never let a raw apiKey
// through even if Hepi regressed. toProviderView re-maps fields explicitly
// (never spreads), so an unexpected apiKey on the input is dropped.
function hepiProviderDto(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    active: true,
    configured: true,
    hasApiKey: true,
    apiKeyPreview: '••••1234',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function hepiModelDefaultsDto(overrides: Record<string, unknown> = {}) {
  return {
    chat: 'claude-sonnet-4.6',
    quiz: {
      primaryModelFast: 'claude-haiku-4.5',
      primaryModelA: 'claude-sonnet-4.6',
      primaryModelB: 'gpt-5',
      tertiaryModel: 'gemini-2.5-pro',
      quaternaryModel: 'claude-opus-4.8',
      metaJudge: 'claude-opus-4.8',
    },
    quizFallback: {
      primaryModelFast: 'claude-haiku-4.5-fallback',
      primaryModelA: 'claude-sonnet-4.6-fallback',
      primaryModelB: 'gpt-5-fallback',
      tertiaryModel: 'gemini-2.5-pro-fallback',
      quaternaryModel: 'claude-opus-4.8-fallback',
      metaJudge: 'claude-opus-4.8-fallback',
    },
    updatedAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  }
}

describe('toProviderView — R3 apiKey strip', () => {
  it('keeps the non-secret fields including the masked preview', () => {
    const view = toProviderView(hepiProviderDto())
    expect(view).toEqual({
      providerId: 'openai',
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      active: true,
      configured: true,
      hasApiKey: true,
      apiKeyPreview: '••••1234',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('drops a raw apiKey if one ever leaks from upstream', () => {
    const view = toProviderView(hepiProviderDto({ apiKey: 'sk-leak-canary-12345' }))
    expect('apiKey' in view).toBe(false)
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('sk-leak-canary-12345')
    expect(serialized).not.toContain('"apiKey"')
  })

  it('passes through an undefined preview when the provider has no key', () => {
    const view = toProviderView(hepiProviderDto({ hasApiKey: false, apiKeyPreview: undefined }))
    expect(view.hasApiKey).toBe(false)
    expect(view.apiKeyPreview).toBeUndefined()
  })
})

describe('toModelDefaultsView', () => {
  it('maps every default field explicitly', () => {
    expect(toModelDefaultsView(hepiModelDefaultsDto())).toEqual({
      chat: 'claude-sonnet-4.6',
      quiz: {
        primaryModelFast: 'claude-haiku-4.5',
        primaryModelA: 'claude-sonnet-4.6',
        primaryModelB: 'gpt-5',
        tertiaryModel: 'gemini-2.5-pro',
        quaternaryModel: 'claude-opus-4.8',
        metaJudge: 'claude-opus-4.8',
      },
      quizFallback: {
        primaryModelFast: 'claude-haiku-4.5-fallback',
        primaryModelA: 'claude-sonnet-4.6-fallback',
        primaryModelB: 'gpt-5-fallback',
        tertiaryModel: 'gemini-2.5-pro-fallback',
        quaternaryModel: 'claude-opus-4.8-fallback',
        metaJudge: 'claude-opus-4.8-fallback',
      },
      updatedAt: '2026-01-03T00:00:00.000Z',
    })
  })

  it('drops unexpected upstream fields', () => {
    const view = toModelDefaultsView(
      hepiModelDefaultsDto({
        apiKey: 'sk-default-canary',
        secret: 'secret-default-canary',
        quiz: { ...hepiModelDefaultsDto().quiz, apiKey: 'sk-quiz-canary' },
      })
    )

    expect('apiKey' in view).toBe(false)
    expect('secret' in view).toBe(false)
    expect('apiKey' in view.quiz).toBe(false)
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('sk-default-canary')
    expect(serialized).not.toContain('secret-default-canary')
    expect(serialized).not.toContain('sk-quiz-canary')
  })
})

describe('resetModelFailures proxy', () => {
  const mockConfig: Config = {
    mongoUri: 'mongodb://localhost:27017/test',
    jwtSecret: 'secret',
    adminUsername: 'admin',
    adminPassword: 'pw',
    adminSecret: 'secret-key-123',
    easyApiUrl: 'https://api.example.test',
    hepiApiUrl: 'https://hepi.example.test',
    usdToVndRate: 26309,
    port: 3010,
  }

  it('calls Hepi /ai-models/reset-failures with model and admin secret', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: {
          model: 'openai/gpt-4o-mini',
          active: true,
          configured: true,
          failureCount: 0,
        },
      }),
    })

    const res = await resetModelFailures(
      'openai/gpt-4o-mini',
      mockConfig,
      fetchMock as unknown as typeof fetch
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://hepi.example.test/ai-models/reset-failures')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Admin-Secret']).toBe('secret-key-123')
    expect(JSON.parse(init.body)).toEqual({ model: 'openai/gpt-4o-mini' })
    expect(res.failureCount).toBe(0)
  })
})
