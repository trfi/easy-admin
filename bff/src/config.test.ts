import { describe, it, expect } from 'vitest'
import { loadConfig } from './config'

const validEnv = {
  MONGODB_URI: 'mongodb://localhost:27017/easyquiz',
  JWT_SECRET: 'a-long-random-secret',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin',
  EASY_API_URL: 'https://api.easyquiz.cc',
  HEPI_API_URL: 'https://api.hepi.cc',
  ADMIN_SECRET: 'hepi-admin-secret',
  USD_TO_VND_RATE: '26309',
  PORT: '3010',
}

describe('loadConfig', () => {
  it('parses a complete valid env', () => {
    const cfg = loadConfig(validEnv)
    expect(cfg.mongoUri).toBe(validEnv.MONGODB_URI)
    expect(cfg.jwtSecret).toBe(validEnv.JWT_SECRET)
    expect(cfg.usdToVndRate).toBe(26309)
    expect(cfg.port).toBe(3010)
  })

  it('defaults port to 3010 when unset', () => {
    const { PORT, ...rest } = validEnv
    expect(loadConfig(rest).port).toBe(3010)
  })

  it('strips trailing slashes from easyApiUrl', () => {
    expect(loadConfig({ ...validEnv, EASY_API_URL: 'https://api.easyquiz.cc/' }).easyApiUrl).toBe(
      'https://api.easyquiz.cc'
    )
  })

  it('strips trailing slashes from hepiApiUrl', () => {
    expect(loadConfig({ ...validEnv, HEPI_API_URL: 'https://api.hepi.cc/' }).hepiApiUrl).toBe(
      'https://api.hepi.cc'
    )
  })

  it.each([
    'MONGODB_URI',
    'JWT_SECRET',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'EASY_API_URL',
    'HEPI_API_URL',
    'ADMIN_SECRET',
  ])('throws when required key %s is missing', (key) => {
    const env = { ...validEnv, [key]: '' }
    expect(() => loadConfig(env)).toThrow(/Missing required environment variables/)
  })

  it('lists all missing keys in the error', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI.*JWT_SECRET/)
  })

  it.each(['0', '-1', 'abc', ''])('rejects invalid USD_TO_VND_RATE %j', (rate) => {
    expect(() => loadConfig({ ...validEnv, USD_TO_VND_RATE: rate })).toThrow(/USD_TO_VND_RATE/)
  })

  it('rejects a non-integer PORT', () => {
    expect(() => loadConfig({ ...validEnv, PORT: '3.5' })).toThrow(/PORT/)
  })
})
