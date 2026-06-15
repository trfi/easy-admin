import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'

export interface RevenueSummary {
  byCurrency: { VND: number; USD: number }
  unifiedVnd: number
  count: number
}

export interface OverviewResponse {
  revenueThisMonth: RevenueSummary
  activeUsers: number
  aiHealth: { total: number; active: number; disabled: number }
}

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => apiFetch<OverviewResponse>('/overview'),
  })
}
