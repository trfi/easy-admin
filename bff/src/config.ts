export interface Config {
  mongoUri: string
  jwtSecret: string
  adminUsername: string
  adminPassword: string
  serviceKey: string
  easyApiUrl: string
  usdToVndRate: number
  port: number
}

const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'SERVICE_KEY',
  'EASY_API_URL',
] as const

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const missing = REQUIRED.filter((key) => !env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const rate = Number(env.USD_TO_VND_RATE)
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('USD_TO_VND_RATE must be a positive number')
  }

  const port = Number(env.PORT ?? '3010')
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer')
  }

  return {
    mongoUri: env.MONGODB_URI!,
    jwtSecret: env.JWT_SECRET!,
    adminUsername: env.ADMIN_USERNAME!,
    adminPassword: env.ADMIN_PASSWORD!,
    serviceKey: env.SERVICE_KEY!,
    easyApiUrl: env.EASY_API_URL!.replace(/\/+$/, ''),
    usdToVndRate: rate,
    port,
  }
}
