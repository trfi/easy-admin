import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import { searchUsers, getUserById, getUserStats } from './users.service'

export function usersRoutes(db: DbHandle, _config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.get('/', async (c) => {
    const q = c.req.query('q')
    const pageRaw = c.req.query('page')
    const limitRaw = c.req.query('limit')
    const result = await searchUsers(db, {
      q,
      page: pageRaw ? Number(pageRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    })
    return c.json(result)
  })

  router.get('/stats', async (c) => {
    const stats = await getUserStats(db)
    return c.json(stats)
  })

  router.get('/:id', async (c) => {
    const user = await getUserById(db, c.req.param('id'))
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json({ user })
  })

  return router
}
