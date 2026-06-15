import type { DbHandle } from '../../db/client'
import {
  COLLECTIONS,
  type AiModelComboDoc,
  type AiProviderDoc,
  type AiProviderStatusDoc,
  type AiProviderView,
} from '../../db/readModels'

// ── R3: the ONE place apiKey is dropped. Every provider response routes through this. ──
// apiKey is stored plaintext in aiproviderconfigs; it must never reach the client or logs.
export function toAiProviderView(doc: AiProviderDoc): AiProviderView {
  return {
    providerId: doc.providerId,
    name: doc.name,
    baseURL: doc.baseURL,
    active: doc.active,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export async function listProviders(db: DbHandle): Promise<AiProviderView[]> {
  const docs = await db
    .collection<AiProviderDoc>(COLLECTIONS.aiProviderConfig)
    .find({})
    .sort({ providerId: 1 })
    .toArray()

  return docs.map(toAiProviderView)
}

export async function listCombos(db: DbHandle): Promise<AiModelComboDoc[]> {
  return db
    .collection<AiModelComboDoc>(COLLECTIONS.aiModelComboConfig)
    .find({})
    .sort({ comboId: 1 })
    .toArray()
}

export async function listStatus(db: DbHandle): Promise<AiProviderStatusDoc[]> {
  return db
    .collection<AiProviderStatusDoc>(COLLECTIONS.aiProviderStatus)
    .find({})
    .sort({ providerId: 1 })
    .toArray()
}
