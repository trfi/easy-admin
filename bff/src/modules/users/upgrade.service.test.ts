import { describe, expect, it, vi } from 'vitest'
import type { Config } from '../../config'
import { upgradePlan, validateUpgrade, UpgradeValidationError } from './upgrade.service'

const request = {
  identifier: 'user@example.com',
  plan: 'Pro' as const,
  packageName: 'Month' as const,
  amount: 79000,
  paymentMethod: 'VCB' as const,
  transactionReference: 'admin:test:123',
  trackPaymentHistory: true
}
const config = { easyApiUrl: 'https://api.test', adminSecret: 'secret' } as Config

describe('upgrade plan proxy', () => {
  it('validates and trims identifiers and references', () => {
    expect(validateUpgrade({ ...request, identifier: ' user@example.com ', transactionReference: ' ref ' }))
      .toMatchObject({ identifier: 'user@example.com', transactionReference: 'ref' })
  })

  it('rejects unsupported values', () => {
    expect(() => validateUpgrade({ ...request, plan: 'Free' })).toThrow(UpgradeValidationError)
    expect(() => validateUpgrade({ ...request, amount: 0 })).toThrow(UpgradeValidationError)
    expect(() => validateUpgrade({ ...request, transactionReference: ' ' })).toThrow(UpgradeValidationError)
  })

  it('allows an explicit untracked upgrade without payment fields', () => {
    expect(validateUpgrade({
      identifier: request.identifier,
      plan: request.plan,
      packageName: request.packageName,
      trackPaymentHistory: false
    })).toEqual({
      identifier: request.identifier,
      plan: request.plan,
      packageName: request.packageName,
      amount: undefined,
      paymentMethod: undefined,
      transactionReference: undefined,
      trackPaymentHistory: false
    })
  })

  it('allows Week for Pro only', () => {
    expect(validateUpgrade({ ...request, packageName: 'Week' })).toMatchObject({
      plan: 'Pro',
      packageName: 'Week'
    })
    expect(() => validateUpgrade({ ...request, plan: 'Premium', packageName: 'Week' }))
      .toThrow('Week is available for Pro only')
  })

  it('sends service authentication and the complete request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    await upgradePlan(request, config, fetchMock as unknown as typeof fetch)
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/user/plan/upgrade', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'X-Admin-Secret': 'secret' }), body: JSON.stringify(request)
    }))
  })

  it('preserves upstream conflict details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: 'Reference conflict' }) })
    await expect(upgradePlan(request, config, fetchMock as unknown as typeof fetch)).rejects.toMatchObject({ status: 409, message: 'Reference conflict' })
  })
})
