import { ObjectId } from 'mongodb'
import type { Config } from '../../config'
import { hepiRequest, HepiUpstreamError } from '../../lib/hepiClient'

export interface TrialActivationResult {
  success: boolean
  message: string
  data?: {
    plan?: unknown
    pointsAdded?: number
  }
}

export class TrialValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TrialValidationError'
  }
}

export { HepiUpstreamError }

export async function activateUserTrial(
  userId: string,
  config: Config,
  fetchImpl: typeof fetch = fetch
): Promise<TrialActivationResult> {
  const trimmed = typeof userId === 'string' ? userId.trim() : ''
  if (!trimmed || !ObjectId.isValid(trimmed)) {
    throw new TrialValidationError('Invalid user ID')
  }

  return hepiRequest<TrialActivationResult>(
    {
      method: 'POST',
      path: '/user/activate-trial',
      body: { identifier: trimmed },
    },
    config,
    fetchImpl
  )
}
