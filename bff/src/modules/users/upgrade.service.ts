import type { Config } from '../../config'

export type UpgradePlan = 'Pro' | 'Premium'
export type UpgradePackage = 'Week' | 'Month' | 'Quarter' | 'Year' | 'Lifetime'
export type PaymentMethod = 'VCB' | 'MoMo' | 'Dodo'

export interface UpgradeInput {
  identifier: unknown
  plan: unknown
  packageName: unknown
  amount?: unknown
  paymentMethod?: unknown
  transactionReference?: unknown
  trackPaymentHistory?: unknown
}

export interface UpgradeRequest {
  identifier: string
  plan: UpgradePlan
  packageName: UpgradePackage
  amount?: number
  paymentMethod?: PaymentMethod
  transactionReference?: string
  trackPaymentHistory: boolean
}

export class UpgradeValidationError extends Error {}
export class UpgradeUpstreamError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export function validateUpgrade(input: UpgradeInput): UpgradeRequest {
  const identifier = typeof input.identifier === 'string' ? input.identifier.trim() : ''
  const transactionReference =
    typeof input.transactionReference === 'string' ? input.transactionReference.trim() : ''
  if (!identifier) throw new UpgradeValidationError('identifier is required')
  if (input.plan !== 'Pro' && input.plan !== 'Premium') {
    throw new UpgradeValidationError('plan must be Pro or Premium')
  }
  if (!['Week', 'Month', 'Quarter', 'Year', 'Lifetime'].includes(input.packageName as string)) {
    throw new UpgradeValidationError('Invalid package')
  }
  if (input.packageName === 'Week' && input.plan !== 'Pro') {
    throw new UpgradeValidationError('Week is available for Pro only')
  }
  const trackPaymentHistory = input.trackPaymentHistory !== false
  if (trackPaymentHistory) {
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
      throw new UpgradeValidationError('amount must be a positive number')
    }
    if (!['VCB', 'MoMo', 'Dodo'].includes(input.paymentMethod as string)) {
      throw new UpgradeValidationError('Invalid payment method')
    }
    if (!transactionReference) throw new UpgradeValidationError('transactionReference is required')
  }
  return {
    identifier,
    plan: input.plan,
    packageName: input.packageName as UpgradePackage,
    amount: trackPaymentHistory ? input.amount as number : undefined,
    paymentMethod: trackPaymentHistory ? input.paymentMethod as PaymentMethod : undefined,
    transactionReference: trackPaymentHistory ? transactionReference : undefined,
    trackPaymentHistory
  }
}

export async function upgradePlan(req: UpgradeRequest, config: Config, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`${config.easyApiUrl}/user/plan/upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': config.adminSecret },
    body: JSON.stringify(req)
  })
  const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string }
  if (!response.ok) {
    throw new UpgradeUpstreamError(response.status, body.message ?? body.error ?? `Upstream error (${response.status})`)
  }
  return body
}
