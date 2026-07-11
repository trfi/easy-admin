import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { Config } from '../../config'
import { upgradePlan, validateUpgrade, UpgradeUpstreamError, UpgradeValidationError } from './upgrade.service'

export function upgradeRoutes(config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()
  router.post('/plan/upgrade', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    try {
      const request = validateUpgrade(body)
      return c.json(await upgradePlan(request, config))
    } catch (error) {
      if (error instanceof UpgradeValidationError) return c.json({ error: error.message }, 400)
      if (error instanceof UpgradeUpstreamError) {
        const status = error.status >= 400 && error.status < 600 ? error.status : 502
        return c.json({ error: error.message }, status as 400)
      }
      throw error
    }
  })
  return router
}
