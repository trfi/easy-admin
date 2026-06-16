import type { Config } from '../config'

// ── Hepi admin-API proxy ──
// Hepi owns the AI provider + model-combo collections and serves them from a 60s
// in-memory runtime cache that it invalidates on its own writes. Writing those
// collections directly from the BFF would be stale and would skip Hepi's
// invariants (provider-referenced guards, duplicate-candidate detection,
// known-provider validation, URL validation, combo soft-delete). Live provider
// tests also require instantiating the AI SDK, which only Hepi can do.
//
// So all AI-config reads/writes/tests route through Hepi's /ai-models routes,
// authenticated with the shared X-Admin-Secret header — the same proxy pattern
// the BFF uses for point adjustments against EasyQuiz (see adjust.service.ts).

// Hepi's error-handler shape (error-handler.middleware.ts): { message, code, ... }.
export class HepiUpstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'HepiUpstreamError'
  }
}

export interface HepiRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string // e.g. "/ai-models/providers"
  body?: unknown
}

// Single choke point for every Hepi call: attaches the admin secret, parses the
// JSON envelope, and normalizes failures to HepiUpstreamError so routes can map
// upstream status codes straight through to the web client.
export async function hepiRequest<T>(
  req: HepiRequest,
  config: Config,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  const res = await fetchImpl(`${config.hepiApiUrl}${req.path}`, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': config.adminSecret,
    },
    ...(req.body !== undefined ? { body: JSON.stringify(req.body) } : {}),
  })

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string; code?: string }
    throw new HepiUpstreamError(
      res.status,
      payload.message ?? `Hepi request failed (${res.status})`,
      payload.code
    )
  }

  // 204 / empty body (e.g. some deletes) — return undefined as T.
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
