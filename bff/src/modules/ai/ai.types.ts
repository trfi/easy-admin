// View types the BFF exposes to the web client. These mirror Hepi's /ai-models
// DTOs but are owned here so the frontend never couples to Hepi's internals.
//
// apiKey is NEVER part of any provider view. Hepi strips it server-side and only
// returns a masked `apiKeyPreview` (e.g. "••••1234"); the BFF re-maps fields
// explicitly (see toProviderView) so a future Hepi change can't leak a raw key
// through this service.

export interface AiProviderView {
  providerId: string
  name: string
  baseURL: string
  active: boolean
  // Hepi-derived: provider has a usable config (active + apiKey + baseURL where required).
  configured: boolean
  hasApiKey: boolean
  apiKeyPreview?: string
  createdAt?: string
  updatedAt?: string
}

export interface AiModelComboCandidate {
  providerId: string
  modelId: string
  active: boolean
}

export interface AiModelComboView {
  comboId: string
  strategy: 'fallback'
  candidates: AiModelComboCandidate[]
  active: boolean
  createdAt?: string
  updatedAt?: string
}

// Per-MODEL status (Hepi keys these by `providerId/modelId`, exposed as `model`).
export interface AiModelStatusView {
  model: string
  active: boolean
  configured: boolean
  failureCount: number
  lastFailureAt?: string
  lastSuccessAt?: string
  lastErrorCode?: string
  lastErrorMessage?: string
  disabledAt?: string
  disabledReason?: string
  updatedBy?: string
}

// Result of a live provider/combo generation test (Hepi calls the real model).
export interface AiTestResult {
  ok: boolean
  mode?: string
  text?: string
  finishReason?: string
  usage?: unknown
  error?: { name?: string; message: string; cause?: unknown }
  elapsedMs: number
}

export interface ProviderTestResponse {
  providerId: string
  modelId: string
  result: AiTestResult
}

export interface ComboTestResponse {
  comboId: string
  candidate: AiModelComboCandidate | null
  result: AiTestResult
}

// User-facing selectable model config. Proxied from Hepi /ai-models/selectable.
export interface SelectableModelView {
  id: string
  label: string
  points: number
  accessTier: string        // opaque string — Hepi owns the enum
  supportsImage: boolean
  comboId: string
  active: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}
