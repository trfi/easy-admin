import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { DbHandle } from '../../db/client'
import type { Config } from '../../config'
import { searchUsers, getUserById, getUserStats } from './users.service'

function parseDate(value: string | undefined, isEndOfDay = false): Date | undefined {
  if (!value) return undefined
  if (isEndOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T23:59:59.999Z`)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

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
    const from = parseDate(c.req.query('from'), false)
    const to = parseDate(c.req.query('to'), true)
    const daysRaw = c.req.query('days')
    const days = daysRaw ? Number(daysRaw) : undefined
    const stats = await getUserStats(db, { from, to, days })
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
