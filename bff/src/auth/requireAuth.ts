import { verify } from 'hono/jwt'
import type { Context, Next } from 'hono'
import type { Config } from '../config'

export interface AuthedUser {
  sub: string
  role: string
}

export function makeRequireAuth(config: Config) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('Authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

    if (!token) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    try {
      const decoded = (await verify(token, config.jwtSecret, 'HS256')) as unknown as AuthedUser
      c.set('user', decoded)
      await next()
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }
}
