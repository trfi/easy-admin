/**
 * Read-only doc sampler (C1 / R2). Prints one sanitized doc per collection so the
 * hand-written read models in src/db/readModels.ts can be reconciled against the
 * real shapes in the shared easyquiz DB.
 *
 * Run: MONGODB_URI=... bun run scripts/sample-docs.ts
 * Never writes. Strips apiKey/password and masks email before printing.
 */
import { MongoClient } from 'mongodb'

const SENSITIVE = new Set(['apiKey', 'password', '__v'])

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE.has(k)) {
        out[k] = '«redacted»'
      } else if (k === 'email' && typeof v === 'string') {
        out[k] = v.replace(/^(.).*(@.*)$/, '$1***$2')
      } else {
        out[k] = sanitize(v)
      }
    }
    return out
  }
  return value
}

// Candidate collection names — the script confirms which actually exist.
const CANDIDATES = [
  'users',
  'paymenthistories',
  'pointtransactions',
  'ai-provider-config',
  'ai-model-combo-config',
  'ai-provider-status',
]

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is required (read-only sampling).')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  try {
    const db = client.db()
    const existing = new Set((await db.listCollections().toArray()).map((c) => c.name))

    for (const name of CANDIDATES) {
      if (!existing.has(name)) {
        console.log(`\n=== ${name} === NOT FOUND (check actual collection name)`)
        continue
      }
      const doc = await db.collection(name).findOne({})
      const count = await db.collection(name).estimatedDocumentCount()
      console.log(`\n=== ${name} === (~${count} docs)`)
      console.log(JSON.stringify(sanitize(doc), null, 2))
    }

    // Surface any collections we didn't anticipate.
    const unanticipated = [...existing].filter((n) => !CANDIDATES.includes(n))
    if (unanticipated.length > 0) {
      console.log('\n=== other collections present ===')
      console.log(unanticipated.join(', '))
    }
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
