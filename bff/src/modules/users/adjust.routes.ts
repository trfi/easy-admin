import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { Config } from '../../config'
import {
  validateAdjust,
  adjustPoints,
  AdjustValidationError,
  AdjustUpstreamError,
} from './adjust.service'

export function adjustRoutes(config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.post('/:id/points/adjust', async (c) => {
    const body = await c.req.json().catch(() => ({}))

    let req
    try {
      req = validateAdjust({
        userId: c.req.param('id'),
        amount: body.amount,
        mode: body.mode,
        reason: body.reason,
        expiresAt: body.expiresAt,
      })
    } catch (err) {
      if (err instanceof AdjustValidationError) {
        return c.json({ error: err.message }, 400)
      }
      throw err
    }

    try {
      const result = await adjustPoints(req, config)
      return c.json(result)
    } catch (err) {
      if (err instanceof AdjustUpstreamError) {
        const status = err.status >= 400 && err.status < 600 ? err.status : 502
        return c.json({ error: err.message }, status as 400)
      }
      throw err
    }
  })

  return router
}
