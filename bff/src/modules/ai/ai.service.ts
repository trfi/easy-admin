import type { Config } from '../../config'
import { hepiRequest } from '../../lib/hepiClient'
import type {
  AiModelComboView,
  AiModelStatusView,
  AiProviderView,
  ComboTestResponse,
  ProviderTestResponse,
} from './ai.types'
import type {
  ComboCreateInput,
  ComboModelOrderInput,
  ComboUpdateInput,
  ProviderCreateInput,
  ProviderUpdateInput,
  TestInput,
} from './ai.validate'

// ── Hepi-owned AI config: every call proxies to Hepi /ai-models (see hepiClient).
// The BFF never touches the aiproviderconfigs / aimodelcomboconfigs collections
// directly — Hepi serves them from a 60s cache and owns all write invariants.

// Raw provider shape Hepi returns (SanitizedAiProviderDto). apiKey is already
// dropped by Hepi; `apiKeyPreview` is masked (e.g. "••••1234"). createdAt/updatedAt
// arrive as ISO strings over JSON.
interface HepiProviderDto {
  providerId: string
  name: string
  baseURL: string
  active: boolean
  configured: boolean
  hasApiKey: boolean
  apiKeyPreview?: string
  createdAt?: string
  updatedAt?: string
}

// ── R3: the ONE place provider fields cross into a BFF view. We re-map field by
// field (never spread) so even if Hepi were to start returning a raw apiKey, it
// could not pass through this boundary to the client.
export function toProviderView(dto: HepiProviderDto): AiProviderView {
  return {
    providerId: dto.providerId,
    name: dto.name,
    baseURL: dto.baseURL,
    active: dto.active,
    configured: dto.configured,
    hasApiKey: dto.hasApiKey,
    apiKeyPreview: dto.apiKeyPreview,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

// ── Providers ──
export async function listProviders(config: Config): Promise<AiProviderView[]> {
  const { providers } = await hepiRequest<{ providers: HepiProviderDto[] }>(
    { method: 'GET', path: '/ai-models/providers' },
    config
  )
  return providers.map(toProviderView)
}

export async function createProvider(
  input: ProviderCreateInput,
  config: Config
): Promise<AiProviderView> {
  const { provider } = await hepiRequest<{ provider: HepiProviderDto }>(
    { method: 'POST', path: '/ai-models/providers', body: input },
    config
  )
  return toProviderView(provider)
}

export async function updateProvider(
  providerId: string,
  input: ProviderUpdateInput,
  config: Config
): Promise<AiProviderView> {
  const { provider } = await hepiRequest<{ provider: HepiProviderDto }>(
    { method: 'PATCH', path: `/ai-models/providers/${encodeURIComponent(providerId)}`, body: input },
    config
  )
  return toProviderView(provider)
}

export async function deleteProvider(providerId: string, config: Config): Promise<void> {
  await hepiRequest<{ success: boolean }>(
    { method: 'DELETE', path: `/ai-models/providers/${encodeURIComponent(providerId)}` },
    config
  )
}

export async function testProvider(
  providerId: string,
  input: TestInput,
  config: Config
): Promise<ProviderTestResponse> {
  return hepiRequest<ProviderTestResponse>(
    { method: 'POST', path: `/ai-models/providers/${encodeURIComponent(providerId)}/test`, body: input },
    config
  )
}

// ── Combos ──
export async function listCombos(config: Config): Promise<AiModelComboView[]> {
  const { combos } = await hepiRequest<{ combos: AiModelComboView[] }>(
    { method: 'GET', path: '/ai-models/combos' },
    config
  )
  return combos
}

export async function createCombo(
  input: ComboCreateInput,
  config: Config
): Promise<AiModelComboView> {
  const { combo } = await hepiRequest<{ combo: AiModelComboView }>(
    { method: 'POST', path: '/ai-models/combos', body: input },
    config
  )
  return combo
}

export async function updateCombo(
  comboId: string,
  input: ComboUpdateInput,
  config: Config
): Promise<AiModelComboView> {
  const { combo } = await hepiRequest<{ combo: AiModelComboView }>(
    { method: 'PATCH', path: `/ai-models/combos/${encodeURIComponent(comboId)}`, body: input },
    config
  )
  return combo
}

export async function deleteCombo(comboId: string, config: Config): Promise<void> {
  await hepiRequest<{ success: boolean }>(
    { method: 'DELETE', path: `/ai-models/combos/${encodeURIComponent(comboId)}` },
    config
  )
}

export async function reorderComboCandidate(
  comboId: string,
  input: ComboModelOrderInput,
  config: Config
): Promise<AiModelComboView> {
  const { combo } = await hepiRequest<{ combo: AiModelComboView }>(
    { method: 'POST', path: `/ai-models/combos/${encodeURIComponent(comboId)}/reorder`, body: input },
    config
  )
  return combo
}

export async function addComboCandidate(
  comboId: string,
  input: { model: string; order?: number },
  config: Config
): Promise<AiModelComboView> {
  const { combo } = await hepiRequest<{ combo: AiModelComboView }>(
    { method: 'POST', path: `/ai-models/combos/${encodeURIComponent(comboId)}/candidates`, body: input },
    config
  )
  return combo
}

export async function removeComboCandidate(
  comboId: string,
  input: { model: string },
  config: Config
): Promise<AiModelComboView> {
  const { combo } = await hepiRequest<{ combo: AiModelComboView }>(
    { method: 'DELETE', path: `/ai-models/combos/${encodeURIComponent(comboId)}/candidates`, body: input },
    config
  )
  return combo
}

export async function testCombo(
  comboId: string,
  input: TestInput,
  config: Config
): Promise<ComboTestResponse> {
  return hepiRequest<ComboTestResponse>(
    { method: 'POST', path: `/ai-models/combos/${encodeURIComponent(comboId)}/test`, body: input },
    config
  )
}

// ── Per-model status (Hepi keys these by providerId/modelId) ──
export async function listStatus(config: Config): Promise<AiModelStatusView[]> {
  const { models } = await hepiRequest<{ models: AiModelStatusView[] }>(
    { method: 'GET', path: '/ai-models' },
    config
  )
  return models
}

export async function activateModel(model: string, config: Config): Promise<AiModelStatusView> {
  const { model: status } = await hepiRequest<{ model: AiModelStatusView }>(
    { method: 'POST', path: '/ai-models/activate', body: { model } },
    config
  )
  return status
}

export async function deactivateModel(
  model: string,
  reason: string | undefined,
  config: Config
): Promise<AiModelStatusView> {
  const { model: status } = await hepiRequest<{ model: AiModelStatusView }>(
    { method: 'POST', path: '/ai-models/deactivate', body: reason ? { model, reason } : { model } },
    config
  )
  return status
}
