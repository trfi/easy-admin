import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'

// NOTE: apiKey is intentionally absent — the BFF strips it (R3). Never add it here.
export interface AiProviderView {
  providerId: string
  name: string
  baseURL: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AiModelComboCandidate {
  providerId: string
  modelId: string
  active: boolean
}

export interface AiModelComboView {
  _id: string
  comboId: string
  strategy: 'fallback'
  candidates: AiModelComboCandidate[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AiProviderStatusView {
  _id: string
  providerId: string
  active: boolean
  failureCount: number
  lastFailureAt?: string
  lastSuccessAt?: string
  lastErrorCode?: string
  lastErrorMessage?: string
  disabledAt?: string
  disabledReason?: string
  updatedBy?: string
}

export function useProviders() {
  return useQuery({
    queryKey: ['ai', 'providers'],
    queryFn: () => apiFetch<{ providers: AiProviderView[] }>('/ai/providers'),
  })
}

export function useCombos() {
  return useQuery({
    queryKey: ['ai', 'combos'],
    queryFn: () => apiFetch<{ combos: AiModelComboView[] }>('/ai/combos'),
  })
}

export function useStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => apiFetch<{ status: AiProviderStatusView[] }>('/ai/status'),
  })
}

export function useToggleProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ providerId, active }: { providerId: string; active: boolean }) =>
      apiFetch<{ provider: AiProviderView }>(`/ai/providers/${providerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai', 'providers'] })
    },
  })
}

export function useUpdateCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      comboId,
      candidates,
      active,
    }: {
      comboId: string
      candidates?: AiModelComboCandidate[]
      active?: boolean
    }) =>
      apiFetch<{ combo: AiModelComboView }>(`/ai/combos/${comboId}`, {
        method: 'PATCH',
        body: JSON.stringify({ candidates, active }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai', 'combos'] })
    },
  })
}
