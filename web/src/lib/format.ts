// Format a VND amount with thousands separators and the ₫ suffix.
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} ₫`
}

// Format a USD amount with the $ prefix and 2 decimals.
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
