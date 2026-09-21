import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { Config } from '../../config'
import {
  activateUserTrial,
  TrialValidationError,
  HepiUpstreamError,
} from './trial.service'

export function trialRoutes(config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.post('/:id/trial/activate', async (c) => {
    const userId = c.req.param('id')
    try {
      const result = await activateUserTrial(userId, config)
      return c.json(result)
    } catch (err) {
      if (err instanceof TrialValidationError) {
        return c.json({ error: err.message }, 400)
      }
      if (err instanceof HepiUpstreamError) {
        const status = err.status >= 400 && err.status < 600 ? err.status : 502
        return c.json({ error: err.message }, status as 400)
      }
      throw err
    }
  })

  return router
}
