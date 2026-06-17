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
  validateSelectableModelCreate,
  validateSelectableModelUpdate,
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

describe('validateSelectableModelCreate', () => {
  const valid = {
    id: 'claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    points: 10,
    accessTier: 'pro',
    supportsImage: true,
    comboId: 'claude-sonnet',
  }

  it('returns the normalized input', () => {
    expect(validateSelectableModelCreate({ ...valid })).toEqual(valid)
  })

  it('trims string fields', () => {
    const result = validateSelectableModelCreate({ ...valid, label: '  Claude Sonnet 4.6  ' })
    expect(result.label).toBe('Claude Sonnet 4.6')
  })

  it('requires id', () => {
    const { id, ...rest } = valid
    expect(() => validateSelectableModelCreate(rest)).toThrow(/id is required/)
  })

  it('requires label', () => {
    expect(() => validateSelectableModelCreate({ ...valid, label: '' })).toThrow(/label is required/)
  })

  it('requires accessTier', () => {
    expect(() => validateSelectableModelCreate({ ...valid, accessTier: '' })).toThrow(/accessTier is required/)
  })

  it('requires comboId', () => {
    expect(() => validateSelectableModelCreate({ ...valid, comboId: '' })).toThrow(/comboId is required/)
  })

  it('requires points to be a non-negative integer', () => {
    expect(() => validateSelectableModelCreate({ ...valid, points: -1 })).toThrow(/points/)
    expect(() => validateSelectableModelCreate({ ...valid, points: 1.5 })).toThrow(/points/)
    expect(validateSelectableModelCreate({ ...valid, points: 0 }).points).toBe(0)
  })

  it('requires supportsImage to be a boolean', () => {
    expect(() => validateSelectableModelCreate({ ...valid, supportsImage: 'yes' })).toThrow(/supportsImage must be a boolean/)
  })

  it('passes optional active through when boolean', () => {
    expect(validateSelectableModelCreate({ ...valid, active: false }).active).toBe(false)
  })

  it('rejects a non-boolean active', () => {
    expect(() => validateSelectableModelCreate({ ...valid, active: 1 })).toThrow(/active must be a boolean/)
  })

  it('passes optional sortOrder through when integer', () => {
    expect(validateSelectableModelCreate({ ...valid, sortOrder: 3 }).sortOrder).toBe(3)
  })

  it('rejects a non-integer sortOrder', () => {
    expect(() => validateSelectableModelCreate({ ...valid, sortOrder: 1.5 })).toThrow(/sortOrder/)
  })
})

describe('validateSelectableModelUpdate', () => {
  it('rejects an empty update', () => {
    expect(() => validateSelectableModelUpdate({})).toThrow(/At least one field/)
  })

  it('accepts a single field', () => {
    expect(validateSelectableModelUpdate({ active: false })).toEqual({ active: false })
  })

  it('accepts label only', () => {
    expect(validateSelectableModelUpdate({ label: 'New label' })).toEqual({ label: 'New label' })
  })

  it('accepts id only', () => {
    expect(validateSelectableModelUpdate({ id: 'claude-opus-4.8' })).toEqual({ id: 'claude-opus-4.8' })
  })

  it('rejects an empty id rename', () => {
    expect(() => validateSelectableModelUpdate({ id: '' })).toThrow(/id is required/)
  })

  it('rejects negative points when present', () => {
    expect(() => validateSelectableModelUpdate({ points: -5 })).toThrow(/points/)
  })

  it('rejects non-boolean supportsImage when present', () => {
    expect(() => validateSelectableModelUpdate({ supportsImage: 'true' })).toThrow(/supportsImage must be a boolean/)
  })

  it('accepts all fields together', () => {
    const input = { id: 'x', label: 'X', points: 5, accessTier: 'free', supportsImage: false, comboId: 'c1', active: true, sortOrder: 1 }
    expect(validateSelectableModelUpdate(input)).toEqual(input)
  })
})
