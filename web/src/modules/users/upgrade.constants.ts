export const UPGRADE_PLANS = ['Pro', 'Premium'] as const
export const UPGRADE_PERIODS = ['Week', 'Month', 'Quarter', 'Year', 'Lifetime'] as const
export const PAYMENT_METHODS = ['VCB', 'MoMo', 'Dodo'] as const

export type UpgradePlan = (typeof UPGRADE_PLANS)[number]
export type UpgradePeriod = (typeof UPGRADE_PERIODS)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const VND_PRICES: {
  Pro: Record<UpgradePeriod, number>
  Premium: Record<Exclude<UpgradePeriod, 'Week'>, number>
} = {
  Pro: { Week: 20000, Month: 79000, Quarter: 199000, Year: 699000, Lifetime: 1790000 },
  Premium: { Month: 209000, Quarter: 529000, Year: 1790000, Lifetime: 4490000 },
}

export function priceFor(plan: UpgradePlan, period: UpgradePeriod): number {
  if (plan === 'Premium' && period === 'Week') {
    throw new Error('Week is available for Pro only')
  }
  return plan === 'Pro'
    ? VND_PRICES.Pro[period]
    : VND_PRICES.Premium[period as Exclude<UpgradePeriod, 'Week'>]
}

export function periodsForPlan(plan: UpgradePlan): readonly UpgradePeriod[] {
  return plan === 'Pro' ? UPGRADE_PERIODS : UPGRADE_PERIODS.filter((period) => period !== 'Week')
}

export function generateAdminReference() {
  return `admin:${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}:${crypto.randomUUID()}`
}
