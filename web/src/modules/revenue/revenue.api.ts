import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'

export type Currency = 'VND' | 'USD'
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed'
export type PaymentGateway = 'Bank' | 'Wallet' | 'Card'

export interface PaymentPayer {
  userId: string
  name?: string
  email?: string
}

export interface PaymentRow {
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
  payer?: PaymentPayer
}

export interface RevenueSummary {
  byCurrency: { VND: number; USD: number }
  unifiedVnd: number
  count: number
}

export interface RevenueResponse {
  rows: PaymentRow[]
  summary: RevenueSummary
  todaySummary: RevenueSummary
  thisMonthSummary: RevenueSummary
  page: number
  limit: number
  total: number
}

export type SeriesInterval = 'day' | 'month'

export interface RevenuePoint {
  period: string
  unifiedVnd: number
  VND: number
  USD: number
  count: number
}

export interface RevenueSeriesResponse {
  series: RevenuePoint[]
  interval: SeriesInterval
}

export interface RevenueFilters {
  status?: PaymentStatus
  currency?: Currency
  gateway?: PaymentGateway
  userId?: string
  from?: string
  to?: string
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function useRevenue(filters: RevenueFilters, page: number, limit: number) {
  return useQuery({
    queryKey: ['revenue', filters, page, limit],
    queryFn: () => apiFetch<RevenueResponse>(`/revenue${toQuery({ ...filters, page, limit })}`),
    placeholderData: keepPreviousData,
  })
}

export function useRevenueSeries(filters: RevenueFilters, interval: SeriesInterval) {
  return useQuery({
    queryKey: ['revenue', 'series', filters, interval],
    queryFn: () =>
      apiFetch<RevenueSeriesResponse>(`/revenue/series${toQuery({ ...filters, interval })}`),
    placeholderData: keepPreviousData,
  })
}
