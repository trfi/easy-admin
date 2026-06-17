// Pure validators for AI-config writes. These run at the BFF boundary before any
// upstream Hepi call — same defense-in-depth posture as validateAdjust. They
// mirror Hepi's zod schemas (ai-models.route.ts) so bad input fails fast with a
// clear message instead of round-tripping to Hepi. Pure → unit-testable.

export class AiValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiValidationError'
  }
}

// Hepi: PROVIDER_ID_PATTERN /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/
const PROVIDER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/
// Hepi: COMBO_ID_PATTERN /^[a-z0-9][a-z0-9_.-]{0,79}$/
const COMBO_ID_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,79}$/

export interface ProviderCreateInput {
  providerId: string
  name: string
  apiKey: string
  baseURL: string
  active?: boolean
}

export interface ProviderUpdateInput {
  name?: string
  apiKey?: string
  baseURL?: string
  active?: boolean
}

export interface ComboCandidateInput {
  providerId: string
  modelId: string
  active?: boolean
}

export interface ComboCreateInput {
  comboId: string
  candidates: ComboCandidateInput[]
  active?: boolean
}

export interface ComboUpdateInput {
  candidates?: ComboCandidateInput[]
  active?: boolean
}

function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AiValidationError(`${field} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new AiValidationError(`${field} must be at most ${max} characters`)
  }
  return trimmed
}

function requireUrl(value: unknown, field: string): string {
  const str = requireString(value, field, 2048)
  try {
    new URL(str)
  } catch {
    throw new AiValidationError(`${field} must be a valid URL`)
  }
  return str
}

export function validateProviderId(value: unknown): string {
  const id = requireString(value, 'providerId', 80)
  if (!PROVIDER_ID_PATTERN.test(id)) {
    throw new AiValidationError('providerId must be alphanumeric (with _ or -), max 80 chars')
  }
  return id
}

export function validateComboId(value: unknown): string {
  const id = requireString(value, 'comboId', 80)
  if (!COMBO_ID_PATTERN.test(id)) {
    throw new AiValidationError('comboId must be lowercase alphanumeric (with _ . -), max 80 chars')
  }
  return id
}

export function validateProviderCreate(input: Record<string, unknown>): ProviderCreateInput {
  const result: ProviderCreateInput = {
    providerId: validateProviderId(input.providerId),
    name: requireString(input.name, 'name', 120),
    apiKey: requireString(input.apiKey, 'apiKey', 4096),
    baseURL: requireUrl(input.baseURL, 'baseURL'),
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw new AiValidationError('active must be a boolean')
    result.active = input.active
  }
  return result
}

export function validateProviderUpdate(input: Record<string, unknown>): ProviderUpdateInput {
  const result: ProviderUpdateInput = {}
  if (input.name !== undefined) result.name = requireString(input.name, 'name', 120)
  if (input.apiKey !== undefined) result.apiKey = requireString(input.apiKey, 'apiKey', 4096)
  if (input.baseURL !== undefined) result.baseURL = requireUrl(input.baseURL, 'baseURL')
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw new AiValidationError('active must be a boolean')
    result.active = input.active
  }
  if (Object.keys(result).length === 0) {
    throw new AiValidationError('At least one field (name, apiKey, baseURL, active) is required')
  }
  return result
}

function validateCandidate(value: unknown): ComboCandidateInput {
  if (typeof value !== 'object' || value === null) {
    throw new AiValidationError('each candidate must be an object')
  }
  const c = value as Record<string, unknown>
  const candidate: ComboCandidateInput = {
    providerId: requireString(c.providerId, 'candidate.providerId', 80),
    modelId: requireString(c.modelId, 'candidate.modelId', 200),
  }
  if (c.active !== undefined) {
    if (typeof c.active !== 'boolean') throw new AiValidationError('candidate.active must be a boolean')
    candidate.active = c.active
  }
  return candidate
}

function validateCandidates(value: unknown): ComboCandidateInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AiValidationError('candidates must be a non-empty array')
  }
  const candidates = value.map(validateCandidate)
  const seen = new Set<string>()
  for (const c of candidates) {
    const key = `${c.providerId}/${c.modelId}`
    if (seen.has(key)) throw new AiValidationError(`duplicate candidate: ${key}`)
    seen.add(key)
  }
  return candidates
}

export function validateComboCreate(input: Record<string, unknown>): ComboCreateInput {
  const result: ComboCreateInput = {
    comboId: validateComboId(input.comboId),
    candidates: validateCandidates(input.candidates),
  }
  if (input.strategy !== undefined && input.strategy !== 'fallback') {
    throw new AiValidationError("strategy must be 'fallback'")
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw new AiValidationError('active must be a boolean')
    result.active = input.active
  }
  return result
}

export function validateComboUpdate(input: Record<string, unknown>): ComboUpdateInput {
  const result: ComboUpdateInput = {}
  if (input.candidates !== undefined) result.candidates = validateCandidates(input.candidates)
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw new AiValidationError('active must be a boolean')
    result.active = input.active
  }
  if (Object.keys(result).length === 0) {
    throw new AiValidationError('At least one field (candidates, active) is required')
  }
  return result
}

// Hepi's combo reorder/add-candidate take a "provider/model" string + 1-based order.
export interface ComboModelOrderInput {
  model: string
  order: number
}

function validateModelString(value: unknown): string {
  const model = requireString(value, 'model', 280)
  const sep = model.indexOf('/')
  if (sep <= 0 || sep === model.length - 1) {
    throw new AiValidationError("model must be in 'providerId/modelId' form")
  }
  return model
}

export function validateComboReorder(input: Record<string, unknown>): ComboModelOrderInput {
  const model = validateModelString(input.model)
  if (typeof input.order !== 'number' || !Number.isInteger(input.order) || input.order < 1) {
    throw new AiValidationError('order must be a positive integer')
  }
  return { model, order: input.order }
}

export function validateComboAddCandidate(
  input: Record<string, unknown>
): { model: string; order?: number } {
  const model = validateModelString(input.model)
  if (input.order === undefined) return { model }
  if (typeof input.order !== 'number' || !Number.isInteger(input.order) || input.order < 1) {
    throw new AiValidationError('order must be a positive integer')
  }
  return { model, order: input.order }
}

export function validateComboRemoveCandidate(input: Record<string, unknown>): { model: string } {
  return { model: validateModelString(input.model) }
}

// Activate/deactivate a per-model status. Hepi's ModelBodySchema: { model, reason? }.
// reason is only meaningful on deactivate; max 500 chars (mirrors Hepi).
export function validateModelStatusInput(
  input: Record<string, unknown>
): { model: string; reason?: string } {
  const model = validateModelString(input.model)
  if (input.reason === undefined) return { model }
  return { model, reason: requireString(input.reason, 'reason', 500) }
}

export function validateSelectableModelId(value: unknown): string {
  return requireString(value, 'id', 200)
}

export interface SelectableModelCreateInput {
  id: string
  label: string
  points: number
  accessTier: string
  supportsImage: boolean
  comboId: string
  active?: boolean
  sortOrder?: number
}

export interface SelectableModelUpdateInput {
  id?: string
  label?: string
  points?: number
  accessTier?: string
  supportsImage?: boolean
  comboId?: string
  active?: boolean
  sortOrder?: number
}

function requireNonNegativeInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AiValidationError(`${field} must be a non-negative integer`)
  }
  return value
}

export function validateSelectableModelCreate(
  input: Record<string, unknown>
): SelectableModelCreateInput {
  const result: SelectableModelCreateInput = {
    id: requireString(input.id, 'id', 200),
    label: requireString(input.label, 'label', 200),
    points: requireNonNegativeInt(input.points, 'points'),
    accessTier: requireString(input.accessTier, 'accessTier', 80),
    supportsImage: (() => {
      if (typeof input.supportsImage !== 'boolean')
        throw new AiValidationError('supportsImage must be a boolean')
      return input.supportsImage
    })(),
    comboId: requireString(input.comboId, 'comboId', 200),
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw new AiValidationError('active must be a boolean')
    result.active = input.active
  }
  if (input.sortOrder !== undefined) {
    result.sortOrder = requireNonNegativeInt(input.sortOrder, 'sortOrder')
  }
  return result
}

export function validateSelectableModelUpdate(
  input: Record<string, unknown>
): SelectableModelUpdateInput {
  const result: SelectableModelUpdateInput = {}
  if (input.id !== undefined) result.id = requireString(input.id, 'id', 200)
  if (input.label !== undefined) result.label = requireString(input.label, 'label', 200)
  if (input.points !== undefined) result.points = requireNonNegativeInt(input.points, 'points')
  if (input.accessTier !== undefined)
    result.accessTier = requireString(input.accessTier, 'accessTier', 80)
  if (input.supportsImage !== undefined) {
    if (typeof input.supportsImage !== 'boolean')
      throw new AiValidationError('supportsImage must be a boolean')
    result.supportsImage = input.supportsImage
  }
  if (input.comboId !== undefined) result.comboId = requireString(input.comboId, 'comboId', 200)
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') throw new AiValidationError('active must be a boolean')
    result.active = input.active
  }
  if (input.sortOrder !== undefined)
    result.sortOrder = requireNonNegativeInt(input.sortOrder, 'sortOrder')
  if (Object.keys(result).length === 0) {
    throw new AiValidationError('At least one field is required')
  }
  return result
}

export interface TestInput {
  model?: string
  prompt?: string
  timeoutMs?: number
  mode?: 'auto' | 'generate' | 'stream'
}

// Provider test requires an explicit model; combo test derives it from candidates.
export function validateTest(input: Record<string, unknown>, requireModel: boolean): TestInput {
  const result: TestInput = {}
  if (requireModel || input.model !== undefined) {
    result.model = requireString(input.model, 'model', 280)
  }
  if (input.prompt !== undefined) result.prompt = requireString(input.prompt, 'prompt', 2000)
  if (input.timeoutMs !== undefined) {
    if (
      typeof input.timeoutMs !== 'number' ||
      !Number.isInteger(input.timeoutMs) ||
      input.timeoutMs < 1000 ||
      input.timeoutMs > 120000
    ) {
      throw new AiValidationError('timeoutMs must be an integer between 1000 and 120000')
    }
    result.timeoutMs = input.timeoutMs
  }
  if (input.mode !== undefined) {
    if (input.mode !== 'auto' && input.mode !== 'generate' && input.mode !== 'stream') {
      throw new AiValidationError("mode must be 'auto', 'generate', or 'stream'")
    }
    result.mode = input.mode
  }
  return result
}
