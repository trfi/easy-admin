import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'

export type Currency = 'VND' | 'USD'
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed'
export type PaymentGateway = 'Bank' | 'Wallet' | 'Card'

export interface PaymentView {
  _id: string
  userId: string
  amount: number
  currency: Currency
  date: string
  type: 'Deposit' | 'Withdraw'
  reason: 'Subscription' | 'Top-up'
  status: PaymentStatus
  paymentGateway: PaymentGateway
  paymentName: string
  voucherCode?: string
}

export interface RevenueSummary {
  byCurrency: { VND: number; USD: number }
  unifiedVnd: number
  count: number
}

export interface RevenueResponse {
  rows: PaymentView[]
  summary: RevenueSummary
}

export interface RevenueFilters {
  status?: PaymentStatus
  currency?: Currency
  gateway?: PaymentGateway
  from?: string
  to?: string
}

function toQuery(filters: RevenueFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useRevenue(filters: RevenueFilters) {
  return useQuery({
    queryKey: ['revenue', filters],
    queryFn: () => apiFetch<RevenueResponse>(`/revenue${toQuery(filters)}`),
    placeholderData: keepPreviousData,
  })
}
