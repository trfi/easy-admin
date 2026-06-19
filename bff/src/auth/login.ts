import { sign } from 'hono/jwt'
import type { Config } from '../config'

export interface LoginInput {
  username: unknown
  password: unknown
}

export interface LoginResult {
  ok: boolean
  token?: string
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

export async function authenticateAdmin(
  input: LoginInput,
  config: Config,
  now: () => number = Date.now
): Promise<LoginResult> {
  const { username, password } = input
  if (typeof username !== 'string' || typeof password !== 'string') {
    return { ok: false }
  }

  if (username !== config.adminUsername) {
    return { ok: false }
  }

  const passwordMatches = password === config.adminPassword
  if (!passwordMatches) {
    return { ok: false }
  }

  const issuedAt = Math.floor(now() / 1000)
  const token = await sign(
    {
      sub: config.adminUsername,
      role: 'admin',
      iat: issuedAt,
      exp: issuedAt + TOKEN_TTL_SECONDS,
    },
    config.jwtSecret,
    'HS256'
  )

  return { ok: true, token }
}
