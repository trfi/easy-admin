import { ObjectId } from 'mongodb'
import type { Config } from '../../config'

export type AdjustMode = 'permanent' | 'expiring'

export interface AdjustInput {
  userId: string
  amount: unknown
  mode: unknown
  reason: unknown
  expiresAt?: unknown
}

export interface AdjustRequest {
  userId: string
  amount: number
  mode: AdjustMode
  reason: string
  expiresAt?: string
}

export interface AdjustResult {
  newBalance: { recurring: number; permanent: number; total: number }
}

export class AdjustValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdjustValidationError'
  }
}

export class AdjustUpstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'AdjustUpstreamError'
  }
}

export const MAX_ADJUSTMENT = 10000

// Validate at the BFF boundary before any upstream call. Positive grants only,
// capped — matches the EasyQuiz endpoint's own checks (defense in depth).
export function validateAdjust(input: AdjustInput): AdjustRequest {
  if (!ObjectId.isValid(input.userId)) {
    throw new AdjustValidationError('Invalid user ID')
  }
  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AdjustValidationError('amount must be a positive number')
  }
  if (input.amount > MAX_ADJUSTMENT) {
    throw new AdjustValidationError(`amount must not exceed ${MAX_ADJUSTMENT}`)
  }
  if (input.mode !== 'permanent' && input.mode !== 'expiring') {
    throw new AdjustValidationError("mode must be 'permanent' or 'expiring'")
  }
  if (typeof input.reason !== 'string' || !input.reason.trim()) {
    throw new AdjustValidationError('reason is required')
  }

  const req: AdjustRequest = {
    userId: input.userId,
    amount: input.amount,
    mode: input.mode,
    reason: input.reason.trim(),
  }

  if (input.mode === 'expiring') {
    if (typeof input.expiresAt !== 'string' || Number.isNaN(new Date(input.expiresAt).getTime())) {
      throw new AdjustValidationError('expiresAt is required for expiring mode')
    }
    req.expiresAt = input.expiresAt
  }

  return req
}

// Proxy the validated adjustment to EasyQuiz. The BFF never mutates points itself —
// the money logic + transaction logging live in the EasyQuiz points service.
export async function adjustPoints(
  req: AdjustRequest,
  config: Config,
  fetchImpl: typeof fetch = fetch
): Promise<AdjustResult> {
  const res = await fetchImpl(`${config.easyApiUrl}/user/${req.userId}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': config.serviceKey,
    },
    body: JSON.stringify({
      amount: req.amount,
      mode: req.mode,
      reason: req.reason,
      ...(req.expiresAt ? { expiresAt: req.expiresAt } : {}),
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new AdjustUpstreamError(res.status, body.message ?? `Upstream error (${res.status})`)
  }

  const data = (await res.json()) as AdjustResult
  return data
}
