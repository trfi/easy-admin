import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import { searchUsers, getUserById } from './users.service'

export function usersRoutes(db: DbHandle, _config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.get('/', async (c) => {
    const q = c.req.query('q')
    const limitRaw = c.req.query('limit')
    const limit = limitRaw ? Number(limitRaw) : undefined
    const users = await searchUsers(db, { q, limit })
    return c.json({ users })
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
