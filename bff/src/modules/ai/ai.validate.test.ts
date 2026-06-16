import { describe, expect, it } from 'vitest'
import {
  AiValidationError,
  validateComboAddCandidate,
  validateComboCreate,
  validateComboId,
  validateComboReorder,
  validateComboUpdate,
  validateProviderCreate,
  validateProviderId,
  validateProviderUpdate,
  validateTest,
} from './ai.validate'

describe('validateProviderId', () => {
  it('accepts a valid id', () => {
    expect(validateProviderId('openai_v2')).toBe('openai_v2')
  })
  it.each(['', '_leading', 'has space', 'a'.repeat(81), '@bad'])('rejects %j', (id) => {
    expect(() => validateProviderId(id)).toThrow(AiValidationError)
  })
})

describe('validateComboId', () => {
  it('accepts lowercase dotted ids', () => {
    expect(validateComboId('claude-sonnet.v2')).toBe('claude-sonnet.v2')
  })
  it('rejects uppercase', () => {
    expect(() => validateComboId('Claude')).toThrow(AiValidationError)
  })
})

describe('validateProviderCreate', () => {
  const valid = {
    providerId: 'openai',
    name: 'OpenAI',
    apiKey: 'sk-123',
    baseURL: 'https://api.openai.com/v1',
  }

  it('returns the normalized input', () => {
    expect(validateProviderCreate({ ...valid })).toEqual(valid)
  })

  it('trims fields', () => {
    expect(validateProviderCreate({ ...valid, name: '  OpenAI  ' }).name).toBe('OpenAI')
  })

  it('requires apiKey', () => {
    const { apiKey, ...rest } = valid
    expect(() => validateProviderCreate(rest)).toThrow(/apiKey is required/)
  })

  it('requires a valid baseURL', () => {
    expect(() => validateProviderCreate({ ...valid, baseURL: 'not-a-url' })).toThrow(/valid URL/)
  })

  it('passes active through when boolean', () => {
    expect(validateProviderCreate({ ...valid, active: false }).active).toBe(false)
  })

  it('rejects a non-boolean active', () => {
    expect(() => validateProviderCreate({ ...valid, active: 'yes' })).toThrow(/active must be a boolean/)
  })
})

describe('validateProviderUpdate', () => {
  it('accepts a single field', () => {
    expect(validateProviderUpdate({ active: true })).toEqual({ active: true })
  })
  it('rejects an empty update', () => {
    expect(() => validateProviderUpdate({})).toThrow(/At least one field/)
  })
  it('validates baseURL when present', () => {
    expect(() => validateProviderUpdate({ baseURL: 'nope' })).toThrow(/valid URL/)
  })
})

describe('validateComboCreate', () => {
  const valid = {
    comboId: 'my-combo',
    candidates: [{ providerId: 'openai', modelId: 'gpt-5' }],
  }

  it('returns normalized candidates', () => {
    expect(validateComboCreate({ ...valid })).toEqual(valid)
  })

  it('rejects an empty candidate list', () => {
    expect(() => validateComboCreate({ comboId: 'x', candidates: [] })).toThrow(/non-empty/)
  })

  it('rejects duplicate candidates', () => {
    expect(() =>
      validateComboCreate({
        comboId: 'x',
        candidates: [
          { providerId: 'a', modelId: 'm' },
          { providerId: 'a', modelId: 'm' },
        ],
      })
    ).toThrow(/duplicate candidate/)
  })

  it('rejects a bad strategy', () => {
    expect(() => validateComboCreate({ ...valid, strategy: 'race' })).toThrow(/strategy/)
  })
})

describe('validateComboUpdate', () => {
  it('rejects an empty update', () => {
    expect(() => validateComboUpdate({})).toThrow(/At least one field/)
  })
  it('accepts active only', () => {
    expect(validateComboUpdate({ active: false })).toEqual({ active: false })
  })
})

describe('validateComboReorder', () => {
  it('accepts a provider/model + order', () => {
    expect(validateComboReorder({ model: 'openai/gpt-5', order: 2 })).toEqual({
      model: 'openai/gpt-5',
      order: 2,
    })
  })
  it('rejects a model without a slash', () => {
    expect(() => validateComboReorder({ model: 'gpt-5', order: 1 })).toThrow(/providerId\/modelId/)
  })
  it('rejects a non-positive order', () => {
    expect(() => validateComboReorder({ model: 'a/b', order: 0 })).toThrow(/positive integer/)
  })
})

describe('validateComboAddCandidate', () => {
  it('allows an omitted order', () => {
    expect(validateComboAddCandidate({ model: 'a/b' })).toEqual({ model: 'a/b' })
  })
  it('keeps a provided order', () => {
    expect(validateComboAddCandidate({ model: 'a/b', order: 3 })).toEqual({ model: 'a/b', order: 3 })
  })
})

describe('validateTest', () => {
  it('requires model for a provider test', () => {
    expect(() => validateTest({}, true)).toThrow(/model is required/)
  })
  it('allows an omitted model for a combo test', () => {
    expect(validateTest({}, false)).toEqual({})
  })
  it('validates the timeout bounds', () => {
    expect(() => validateTest({ model: 'a/b', timeoutMs: 999 }, true)).toThrow(/timeoutMs/)
    expect(validateTest({ model: 'a/b', timeoutMs: 5000 }, true).timeoutMs).toBe(5000)
  })
  it('validates the mode enum', () => {
    expect(() => validateTest({ mode: 'turbo' }, false)).toThrow(/mode/)
    expect(validateTest({ mode: 'stream' }, false).mode).toBe('stream')
  })
})
