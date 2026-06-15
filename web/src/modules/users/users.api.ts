import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'

export interface UserPlanView {
  name: string
  startDate?: string
  endDate?: string
  isReward?: boolean
  isTrial?: boolean
  isLifetime?: boolean
  packageDuration?: string
}

export interface UserPointsView {
  recurring: number
  permanent: number
  total: number
  updatedAt?: string
  lastRenew?: string
}

export interface AdminUserView {
  _id: string
  name?: string
  email: string
  username?: string
  role: 'Admin' | 'User'
  avatar?: string | null
  plan?: UserPlanView
  points: UserPointsView
  subscriptionPackage?: string
  isBlacklisted?: boolean
  trialActivatedAt?: string
  createdAt: string
  updatedAt: string
}

export function useUsers(q: string) {
  return useQuery({
    queryKey: ['users', q],
    queryFn: () => {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
      return apiFetch<{ users: AdminUserView[] }>(`/users${qs}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiFetch<{ user: AdminUserView }>(`/users/${id}`),
    enabled: id !== null,
  })
}

export type AdjustMode = 'permanent' | 'expiring'

export interface AdjustPointsInput {
  userId: string
  amount: number
  mode: AdjustMode
  reason: string
  expiresAt?: string
}

export interface AdjustPointsResult {
  newBalance: { recurring: number; permanent: number; total: number }
}

export function useAdjustPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, amount, mode, reason, expiresAt }: AdjustPointsInput) =>
      apiFetch<AdjustPointsResult>(`/users/${userId}/points/adjust`, {
        method: 'POST',
        body: JSON.stringify({ amount, mode, reason, ...(expiresAt ? { expiresAt } : {}) }),
      }),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['user', userId] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
