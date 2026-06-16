export interface Config {
  mongoUri: string
  jwtSecret: string
  adminUsername: string
  adminPassword: string
  easyApiUrl: string
  hepiApiUrl: string
  adminSecret: string
  usdToVndRate: number
  port: number
}

const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'EASY_API_URL',
  'HEPI_API_URL',
  'ADMIN_SECRET',
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
    easyApiUrl: env.EASY_API_URL!.replace(/\/+$/, ''),
    hepiApiUrl: env.HEPI_API_URL!.replace(/\/+$/, ''),
    adminSecret: env.ADMIN_SECRET!,
    usdToVndRate: rate,
    port,
  }
}
