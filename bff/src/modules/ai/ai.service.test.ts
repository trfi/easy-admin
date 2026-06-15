import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { toAiProviderView } from './ai.service'
import type { AiProviderDoc } from '../../db/readModels'

function providerDoc(overrides: Partial<AiProviderDoc> = {}): AiProviderDoc {
  return {
    _id: new ObjectId(),
    providerId: 'openai',
    name: 'OpenAI',
    apiKey: 'sk-super-secret-do-not-leak',
    baseURL: 'https://api.openai.com/v1',
    active: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  }
}

describe('toAiProviderView — R3 apiKey strip', () => {
  it('omits apiKey from the view', () => {
    const view = toAiProviderView(providerDoc())
    expect('apiKey' in view).toBe(false)
  })

  it('keeps the non-secret fields', () => {
    const view = toAiProviderView(providerDoc())
    expect(view).toEqual({
      providerId: 'openai',
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      active: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    })
  })

  it('the serialized payload never contains the secret value', () => {
    const view = toAiProviderView(providerDoc({ apiKey: 'sk-leak-canary-12345' }))
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('sk-leak-canary-12345')
    expect(serialized).not.toContain('apiKey')
  })

  it('strips apiKey even when other secret-ish keys vary', () => {
    const view = toAiProviderView(providerDoc({ apiKey: '' }))
    expect('apiKey' in view).toBe(false)
  })
})
