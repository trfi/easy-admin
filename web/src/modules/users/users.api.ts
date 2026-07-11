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

export interface UserSearchResponse {
  users: AdminUserView[]
  page: number
  limit: number
  total: number
}

export function useUsers(q: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['users', q, page, limit],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))
      return apiFetch<UserSearchResponse>(`/users?${params.toString()}`)
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

export interface UserStatsPoint {
  date: string
  count: number
}

export interface UserStats {
  activeToday: number
  activeThisMonth: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
  newByDay: UserStatsPoint[]
  activeByDay: UserStatsPoint[]
}

export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: () => apiFetch<UserStats>('/users/stats'),
    staleTime: 5 * 60 * 1000,
  })
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

export interface UpgradePlanInput {
  userId: string
  identifier: string
  plan: 'Pro' | 'Premium'
  packageName: 'Week' | 'Month' | 'Quarter' | 'Year' | 'Lifetime'
  amount?: number
  paymentMethod?: 'VCB' | 'MoMo' | 'Dodo'
  transactionReference?: string
  trackPaymentHistory: boolean
}

export function useUpgradePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId: _, ...body }: UpgradePlanInput) =>
      apiFetch('/users/plan/upgrade', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['user', userId] })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['revenue'] })
    },
  })
}
