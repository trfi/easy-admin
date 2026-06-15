import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import { getOverview } from './overview.service'

export function overviewRoutes(db: DbHandle, config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.get('/', async (c) => {
    const overview = await getOverview(db, config.usdToVndRate)
    return c.json(overview)
  })

  return router
}
