import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'

// NOTE: a raw apiKey is NEVER part of any provider view — the BFF strips it (R3)
// and only exposes a masked `apiKeyPreview`. Never add an apiKey field here.
export interface AiProviderView {
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

export interface ProviderTestInput {
  model: string
  prompt?: string
  timeoutMs?: number
  mode?: 'auto' | 'generate' | 'stream'
}

export interface ComboTestInput {
  model?: string
  prompt?: string
  timeoutMs?: number
  mode?: 'auto' | 'generate' | 'stream'
}

const PROVIDERS_KEY = ['ai', 'providers'] as const
const COMBOS_KEY = ['ai', 'combos'] as const
const STATUS_KEY = ['ai', 'status'] as const

// ── Queries ──
export function useProviders() {
  return useQuery({
    queryKey: PROVIDERS_KEY,
    queryFn: () => apiFetch<{ providers: AiProviderView[] }>('/ai/providers'),
  })
}

export function useCombos() {
  return useQuery({
    queryKey: COMBOS_KEY,
    queryFn: () => apiFetch<{ combos: AiModelComboView[] }>('/ai/combos'),
  })
}

export function useStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => apiFetch<{ status: AiModelStatusView[] }>('/ai/status'),
  })
}

// Activate/deactivate a per-model status. Hepi keys these by "providerId/modelId"
// and owns the failure-count / disabled-reason bookkeeping; we just flip the flag.
export function useActivateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ model }: { model: string }) =>
      apiFetch<{ status: AiModelStatusView }>('/ai/status/activate', {
        method: 'POST',
        body: JSON.stringify({ model }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_KEY }),
  })
}

export function useDeactivateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ model, reason }: { model: string; reason?: string }) =>
      apiFetch<{ status: AiModelStatusView }>('/ai/status/deactivate', {
        method: 'POST',
        body: JSON.stringify(reason ? { model, reason } : { model }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_KEY }),
  })
}

// ── Provider mutations ──
export function useCreateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProviderCreateInput) =>
      apiFetch<{ provider: AiProviderView }>('/ai/providers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROVIDERS_KEY })
      qc.invalidateQueries({ queryKey: STATUS_KEY })
    },
  })
}

export function useUpdateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ providerId, input }: { providerId: string; input: ProviderUpdateInput }) =>
      apiFetch<{ provider: AiProviderView }>(`/ai/providers/${encodeURIComponent(providerId)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROVIDERS_KEY })
      qc.invalidateQueries({ queryKey: STATUS_KEY })
    },
  })
}

export function useDeleteProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (providerId: string) =>
      apiFetch<{ success: boolean }>(`/ai/providers/${encodeURIComponent(providerId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROVIDERS_KEY })
      qc.invalidateQueries({ queryKey: STATUS_KEY })
      qc.invalidateQueries({ queryKey: COMBOS_KEY })
    },
  })
}

// A live test does not mutate config, but it is an action with a result — model
// it as a mutation so the UI gets isPending/data/error without query caching.
export function useTestProvider() {
  return useMutation({
    mutationFn: ({ providerId, input }: { providerId: string; input: ProviderTestInput }) =>
      apiFetch<ProviderTestResponse>(`/ai/providers/${encodeURIComponent(providerId)}/test`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}

// ── Combo mutations ──
export function useCreateCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ComboCreateInput) =>
      apiFetch<{ combo: AiModelComboView }>('/ai/combos', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMBOS_KEY }),
  })
}

export function useUpdateCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ comboId, input }: { comboId: string; input: ComboUpdateInput }) =>
      apiFetch<{ combo: AiModelComboView }>(`/ai/combos/${encodeURIComponent(comboId)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMBOS_KEY }),
  })
}

export function useDeleteCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comboId: string) =>
      apiFetch<{ success: boolean }>(`/ai/combos/${encodeURIComponent(comboId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMBOS_KEY }),
  })
}

// Hepi's reorder takes a "providerId/modelId" string + a 1-based target position.
export function useReorderCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ comboId, model, order }: { comboId: string; model: string; order: number }) =>
      apiFetch<{ combo: AiModelComboView }>(
        `/ai/combos/${encodeURIComponent(comboId)}/reorder`,
        { method: 'POST', body: JSON.stringify({ model, order }) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMBOS_KEY }),
  })
}

// Hepi's add-candidate takes a "providerId/modelId" string + an optional 1-based
// position (appended to the end of the fallback chain when omitted).
export function useAddComboCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ comboId, model, order }: { comboId: string; model: string; order?: number }) =>
      apiFetch<{ combo: AiModelComboView }>(
        `/ai/combos/${encodeURIComponent(comboId)}/candidates`,
        { method: 'POST', body: JSON.stringify(order === undefined ? { model } : { model, order }) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMBOS_KEY }),
  })
}

// Removes a candidate from the fallback chain. Hepi rejects removing the last one
// (a combo must keep ≥1 candidate); the UI disables delete in that case too.
export function useRemoveComboCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ comboId, model }: { comboId: string; model: string }) =>
      apiFetch<{ combo: AiModelComboView }>(
        `/ai/combos/${encodeURIComponent(comboId)}/candidates`,
        { method: 'DELETE', body: JSON.stringify({ model }) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMBOS_KEY }),
  })
}

export function useTestCombo() {
  return useMutation({
    mutationFn: ({ comboId, input }: { comboId: string; input: ComboTestInput }) =>
      apiFetch<ComboTestResponse>(`/ai/combos/${encodeURIComponent(comboId)}/test`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
