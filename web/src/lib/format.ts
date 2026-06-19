// Format a VND amount with thousands separators and the ₫ suffix.
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} ₫`
}

// Format a USD amount with the $ prefix and 2 decimals.
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Compact VND for chart axes/tooltips (e.g. 1.2M ₫, 350K ₫). Pure.
export function formatVndCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₫`
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}K ₫`
  return `${amount} ₫`
}

// Short date (no time). Returns an em dash for missing/invalid input.
export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

// Date + time. Returns an em dash for missing/invalid input.
export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}
