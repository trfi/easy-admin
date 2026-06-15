import { describe, it, expect } from 'vitest'
import type { Config } from '../config'
import { authenticateAdmin } from './login'
import { createApp } from '../app'

const PASSWORD = 'correct-horse-battery-staple'

function makeConfig(password: string): Config {
  return {
    mongoUri: 'mongodb://localhost:27017/test',
    jwtSecret: 'test-secret-please-ignore-0123456789',
    adminUsername: 'admin',
    adminPassword: password,
    serviceKey: 'svc',
    easyApiUrl: 'https://api.example.test',
    usdToVndRate: 26309,
    port: 3010,
  }
}

describe('authenticateAdmin', () => {
  const config = makeConfig(PASSWORD)

  it('issues a token for a valid credential', async () => {
    const result = await authenticateAdmin({ username: 'admin', password: PASSWORD }, config)
    expect(result.ok).toBe(true)
    expect(typeof result.token).toBe('string')
  })

  it('rejects a wrong password', async () => {
    const result = await authenticateAdmin({ username: 'admin', password: 'nope' }, config)
    expect(result.ok).toBe(false)
    expect(result.token).toBeUndefined()
  })

  it('rejects an unknown username', async () => {
    const result = await authenticateAdmin({ username: 'root', password: PASSWORD }, config)
    expect(result.ok).toBe(false)
  })

  it('rejects non-string inputs', async () => {
    const result = await authenticateAdmin({ username: 123, password: null }, config)
    expect(result.ok).toBe(false)
  })
})

describe('app auth routes', () => {
  const config = makeConfig(PASSWORD)

  it('POST /api/auth/login returns a token on good credential', async () => {
    const app = createApp(config)
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: PASSWORD }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { token: string }
    expect(typeof json.token).toBe('string')
  })

  it('POST /api/auth/login 401s on bad credential', async () => {
    const app = createApp(config)
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    })
    expect(res.status).toBe(401)
  })

  it('protected route 401s without a token', async () => {
    const app = createApp(config)
    const res = await app.request('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('protected route 200s with a valid token', async () => {
    const app = createApp(config)
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: PASSWORD }),
    })
    const { token } = (await login.json()) as { token: string }

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { user: { sub: string; role: string } }
    expect(json.user.sub).toBe('admin')
    expect(json.user.role).toBe('admin')
  })

  it('protected route 401s with a malformed token', async () => {
    const app = createApp(config)
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer not-a-real-jwt' },
    })
    expect(res.status).toBe(401)
  })
})
