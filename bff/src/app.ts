import { Hono } from 'hono'
import type { Config } from './config'
import type { DbHandle } from './db/client'
import { authenticateAdmin } from './auth/login'
import { makeRequireAuth, type AuthedUser } from './auth/requireAuth'
import { revenueRoutes } from './modules/revenue/revenue.routes'
import { usersRoutes } from './modules/users/users.routes'
import { adjustRoutes } from './modules/users/adjust.routes'
import { upgradeRoutes } from './modules/users/upgrade.routes'
import { aiRoutes } from './modules/ai/ai.routes'
import { overviewRoutes } from './modules/overview/overview.routes'

export interface AppEnv {
  Variables: { user: AuthedUser }
}

// db is optional so auth-only tests can construct the app without a live Mongo.
// In production, index.ts connects and passes the handle so module routes mount.
export function createApp(config: Config, db?: DbHandle): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  const requireAuth = makeRequireAuth(config)

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const result = await authenticateAdmin(
      { username: body.username, password: body.password },
      config
    )
    if (!result.ok) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    return c.json({ token: result.token })
  })

  app.get('/api/auth/me', requireAuth, (c) => {
    return c.json({ user: c.get('user') })
  })

  if (db) {
    app.use('/api/overview/*', requireAuth)
    app.use('/api/revenue/*', requireAuth)
    app.use('/api/users/*', requireAuth)
    app.use('/api/ai/*', requireAuth)

    app.route('/api/overview', overviewRoutes(db, config))
    app.route('/api/revenue', revenueRoutes(db, config))
    app.route('/api/users', adjustRoutes(config))
    app.route('/api/users', upgradeRoutes(config))
    app.route('/api/users', usersRoutes(db, config))
    app.route('/api/ai', aiRoutes(config))
  }

  return app
}
