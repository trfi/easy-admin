import { spawnSync } from 'node:child_process'
import { existsSync, unlinkSync, statSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Configuration with environment variable overrides
const DOKPLOY_URL = (process.env.DOKPLOY_URL || '').replace(/\/+$/, '').replace(/\/api$/, '')
const API_KEY = process.env.DOKPLOY_API_KEY || ''
const APP_ID = process.env.DOKPLOY_APP_ID || ''
const VERIFY_URL = process.env.VERIFY_URL || ''
const ZIP_NAME = 'deploy.zip'

interface DokployDeployment {
  deploymentId: string
  title?: string
  status: 'queued' | 'running' | 'done' | 'error' | 'failed' | 'cancelled' | string
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  errorMessage?: string | null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function find7zCommand(): string {
  try {
    const res = spawnSync('7z', ['--help'], { stdio: 'ignore' })
    if (res.status === 0 || res.status === 7) return '7z'
  } catch {}

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\7-Zip\\7z.exe',
      'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    ]
    for (const path of candidates) {
      if (existsSync(path)) return path
    }
  }

  return '7z'
}

function runTypecheck(): void {
  console.log('🔍 [1/5] Running TypeScript check (bun run typecheck)...')
  const res = spawnSync('bun', ['run', 'typecheck'], {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
    shell: true,
  })

  if (res.status !== 0) {
    throw new Error('Typecheck failed. Please fix TypeScript errors before deploying.')
  }
  console.log('✅ Typecheck passed.')
}

function buildDeployZip(zipPath: string): void {
  console.log(`📦 [2/5] Building deployment archive: ${ZIP_NAME}...`)

  if (existsSync(zipPath)) {
    try {
      unlinkSync(zipPath)
      console.log('   Removed existing zip file.')
    } catch (err) {
      console.warn('   Could not delete existing zip file:', err)
    }
  }

  const cmd7z = find7zCommand()
  const excludes = [
    '-xr!node_modules',
    '-xr!.git',
    '-xr!.env',
    '-xr!.env.*',
    '-xr!logs',
    '-xr!dist',
    '-xr!deploy.zip',
    '-xr!docs',
    '-xr!.agents',
    '-xr!.claude',
    '-xr!.codegraph',
  ]

  const args = ['a', '-tzip', zipPath, ...excludes, './*']
  const serverDir = resolve(__dirname, '..')

  const res = spawnSync(cmd7z, args, {
    stdio: 'inherit',
    cwd: serverDir,
  })

  if (res.status !== 0 || !existsSync(zipPath)) {
    throw new Error(`Failed to create ${ZIP_NAME} with 7z (exit code: ${res.status}).`)
  }

  const stat = statSync(zipPath)
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2)
  console.log(`✅ Built ${ZIP_NAME} (${sizeMb} MB / ${stat.size} bytes).`)
}

async function fetchDeployments(): Promise<DokployDeployment[]> {
  const url = `${DOKPLOY_URL}/api/trpc/deployment.all?input=${encodeURIComponent(
    JSON.stringify({ json: { applicationId: APP_ID } })
  )}`

  const res = await fetch(url, {
    headers: { 'x-api-key': API_KEY },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch deployments (HTTP ${res.status}): ${text}`)
  }

  const data = (await res.json()) as { result?: { data?: { json?: DokployDeployment[] } } }
  return (data?.result?.data?.json as DokployDeployment[]) || []
}

async function fetchDeploymentLogs(deploymentId: string): Promise<void> {
  try {
    console.log(`\n📋 Fetching deployment logs for ID "${deploymentId}"...`)
    const url = `${DOKPLOY_URL}/api/trpc/deployment.readLogs?input=${encodeURIComponent(
      JSON.stringify({ json: { deploymentId } })
    )}`

    const res = await fetch(url, {
      headers: { 'x-api-key': API_KEY },
    })

    if (!res.ok) {
      console.warn(`   Could not retrieve logs: HTTP ${res.status}`)
      return
    }

    const data = (await res.json()) as { result?: { data?: { json?: string } } }
    const logs = data?.result?.data?.json
    if (typeof logs === 'string' && logs.trim()) {
      const lines = logs.trim().split('\n')
      const tail = lines.slice(-40).join('\n')
      console.log('\n--- Dokploy Build Logs (Last 40 lines) ---')
      console.log(tail)
      console.log('-------------------------------------------\n')
    }
  } catch (err) {
    console.warn('   Failed to fetch logs:', err)
  }
}

async function uploadZip(zipPath: string): Promise<void> {
  console.log(`🚀 [3/5] Uploading ${ZIP_NAME} to Dokploy (${DOKPLOY_URL})...`)

  const zipBuffer = readFileSync(zipPath)
  const formData = new FormData()
  formData.append('applicationId', APP_ID)
  formData.append('zip', new Blob([zipBuffer], { type: 'application/zip' }), ZIP_NAME)

  const res = await fetch(`${DOKPLOY_URL}/api/application.dropDeployment`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
    },
    body: formData,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Dokploy upload failed (HTTP ${res.status}): ${errorText}`)
  }

  const responseText = await res.text()
  console.log(`✅ Upload response [HTTP ${res.status}]: ${responseText || 'OK'}`)
}

async function monitorDeployment(initialLatestId?: string): Promise<DokployDeployment> {
  console.log('⏳ [4/5] Monitoring Dokploy deployment status...')
  const startTime = Date.now()
  const MAX_WAIT_MS = 10 * 60 * 1000 // 10 minutes timeout
  let targetDeploymentId: string | null = null

  // Wait up to 30s for the new deployment entry to appear
  while (Date.now() - startTime < 30_000) {
    await sleep(2000)
    const deployments = await fetchDeployments()
    const latest = deployments[0]
    if (latest && latest.deploymentId !== initialLatestId) {
      targetDeploymentId = latest.deploymentId
      break
    }
  }

  if (!targetDeploymentId) {
    const deployments = await fetchDeployments()
    targetDeploymentId = deployments[0]?.deploymentId || null
    console.log(`   Notice: Watching latest deployment ID: ${targetDeploymentId}`)
  } else {
    console.log(`   Registered deployment ID: ${targetDeploymentId}`)
  }

  if (!targetDeploymentId) {
    throw new Error('No deployment found on Dokploy for this application.')
  }

  let lastStatus = ''
  while (Date.now() - startTime < MAX_WAIT_MS) {
    const deployments = await fetchDeployments()
    const current = deployments.find((d) => d.deploymentId === targetDeploymentId)

    if (!current) {
      await sleep(2500)
      continue
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000)

    if (current.status !== lastStatus) {
      console.log(`   ⏱️ [${elapsed}s] Status: ${current.status}`)
      lastStatus = current.status
    }

    if (current.status === 'done') {
      console.log(`✅ Deployment finished successfully in ${elapsed}s!`)
      return current
    }

    if (['error', 'failed', 'cancelled'].includes(current.status)) {
      console.error(`❌ Deployment failed with status "${current.status}"`)
      if (current.errorMessage) {
        console.error(`   Error message: ${current.errorMessage}`)
      }
      await fetchDeploymentLogs(targetDeploymentId)
      throw new Error(`Dokploy deployment failed with status: ${current.status}`)
    }

    await sleep(2500)
  }

  await fetchDeploymentLogs(targetDeploymentId)
  throw new Error(`Deployment timed out after ${Math.round(MAX_WAIT_MS / 1000)}s.`)
}

async function verifyEndpoint(verifyUrl: string): Promise<void> {
  if (!verifyUrl) {
    console.log('⏩ [5/5] Skipping endpoint verification (VERIFY_URL is not set).')
    return
  }

  console.log(`🌐 [5/5] Verifying live endpoint at ${verifyUrl}...`)

  // Initial grace period for Traefik routing / container warm-up
  await sleep(3000)

  const maxAttempts = 15
  let consecutiveSuccesses = 0
  const requiredConsecutive = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(verifyUrl, {
        headers: { 'User-Agent': 'easy-admin-deploy-verifier/1.0' },
      })
      const text = await res.text()

      if (res.status === 200 && (text.includes('Easy Admin') || !text.includes('Dokploy'))) {
        consecutiveSuccesses++
        const snippet = text.replace(/\s+/g, ' ').slice(0, 60).trim()
        console.log(`   Attempt ${attempt}/${maxAttempts}: HTTP 200 OK (${snippet}) [${consecutiveSuccesses}/${requiredConsecutive}]`)
        if (consecutiveSuccesses >= requiredConsecutive) {
          console.log(`✅ Endpoint verified healthy with ${requiredConsecutive} consecutive successful checks!`)
          return
        }
      } else {
        consecutiveSuccesses = 0
        console.log(`   Attempt ${attempt}/${maxAttempts}: HTTP ${res.status} - ${text.slice(0, 100).trim()}`)
      }
    } catch (err) {
      consecutiveSuccesses = 0
      console.log(`   Attempt ${attempt}/${maxAttempts}: Request failed - ${(err as Error).message}`)
    }

    await sleep(2500)
  }

  throw new Error(`Verification failed after ${maxAttempts} attempts on ${verifyUrl}`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: bun run deploy [options]

Options:
  --skip-typecheck, --no-typecheck   Skip pre-deployment TypeScript type checking
  --skip-build                       Skip building deploy.zip and upload existing archive
  --skip-verify                      Skip healthcheck endpoint verification after deployment
  --clean                            Remove deploy.zip after successful deployment
  --help, -h                         Show this help message

Environment Variables:
  DOKPLOY_URL     Dokploy instance URL (e.g. http://15.235.192.183:3000)
  DOKPLOY_API_KEY Dokploy API key
  DOKPLOY_APP_ID  Dokploy Application ID
  VERIFY_URL      Verification endpoint (e.g. https://admin.easyquiz.cc/)
`)
    process.exit(0)
  }

  const skipTypecheck = args.includes('--skip-typecheck') || args.includes('--no-typecheck')
  const skipBuild = args.includes('--skip-build')
  const skipVerify = args.includes('--skip-verify')
  const cleanAfter = args.includes('--clean')

  const serverDir = resolve(__dirname, '..')
  const zipPath = resolve(serverDir, ZIP_NAME)

  console.log('====================================================')
  console.log('        EASY ADMIN DOKPLOY DEPLOYMENT               ')
  console.log('====================================================')
  console.log(`Dokploy URL : ${DOKPLOY_URL || '(not set)'}`)
  console.log(`App ID      : ${APP_ID || '(not set)'}`)
  console.log(`Verify URL  : ${VERIFY_URL || '(not set)'}`)
  console.log('----------------------------------------------------')

  if (!DOKPLOY_URL || !API_KEY || !APP_ID) {
    throw new Error('Missing required environment variables: DOKPLOY_URL, DOKPLOY_API_KEY, and DOKPLOY_APP_ID must be set.')
  }

  // Step 1: Typecheck
  if (!skipTypecheck) {
    runTypecheck()
  } else {
    console.log('⏩ [1/5] Skipping typecheck (--skip-typecheck).')
  }

  // Record existing latest deployment before upload
  let initialLatestId: string | undefined
  try {
    const prev = await fetchDeployments()
    initialLatestId = prev[0]?.deploymentId
  } catch (err) {
    console.warn('   Could not retrieve current deployment list:', err)
  }

  // Step 2: Build Zip
  if (!skipBuild) {
    buildDeployZip(zipPath)
  } else {
    console.log(`⏩ [2/5] Skipping build (--skip-build), using ${zipPath}.`)
    if (!existsSync(zipPath)) {
      throw new Error(`Cannot skip build: ${zipPath} does not exist.`)
    }
  }

  // Step 3: Upload to Dokploy
  await uploadZip(zipPath)

  // Step 4: Monitor status until done
  await monitorDeployment(initialLatestId)

  // Step 5: Verify
  if (!skipVerify && VERIFY_URL) {
    await verifyEndpoint(VERIFY_URL)
  } else if (!VERIFY_URL) {
    console.log('⏩ [5/5] Skipping verification (VERIFY_URL is not set).')
  } else {
    console.log('⏩ [5/5] Skipping verification (--skip-verify).')
  }

  // Cleanup if requested
  if (cleanAfter && existsSync(zipPath)) {
    try {
      unlinkSync(zipPath)
      console.log(`🧹 Cleaned up ${ZIP_NAME}.`)
    } catch {}
  }

  console.log('====================================================')
  console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!')
  console.log('====================================================')
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
