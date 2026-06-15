import { Hono } from 'hono'
import type { AppEnv } from '../../app'
import type { DbHandle } from '../../db/client'
import { COLLECTIONS, type AiModelComboDoc, type AiProviderDoc } from '../../db/readModels'
import { listCombos, listProviders, listStatus, toAiProviderView } from './ai.service'

export function aiRoutes(db: DbHandle): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.get('/providers', async (c) => {
    return c.json({ providers: await listProviders(db) })
  })

  router.get('/combos', async (c) => {
    return c.json({ combos: await listCombos(db) })
  })

  router.get('/status', async (c) => {
    return c.json({ status: await listStatus(db) })
  })

  // Toggle provider active — direct write to an allowlisted collection.
  router.patch('/providers/:providerId', async (c) => {
    const providerId = c.req.param('providerId')
    const body = await c.req.json().catch(() => ({}))
    if (typeof body.active !== 'boolean') {
      return c.json({ error: 'active (boolean) is required' }, 400)
    }

    const result = await db
      .collection<AiProviderDoc>(COLLECTIONS.aiProviderConfig)
      .findOneAndUpdate(
        { providerId },
        { $set: { active: body.active, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )

    if (!result) {
      return c.json({ error: 'Provider not found' }, 404)
    }
    return c.json({ provider: toAiProviderView(result) })
  })

  // Edit model combo (candidates / active) — direct write to an allowlisted collection.
  router.patch('/combos/:comboId', async (c) => {
    const comboId = c.req.param('comboId')
    const body = await c.req.json().catch(() => ({}))

    const update: Partial<Pick<AiModelComboDoc, 'candidates' | 'active'>> = {}
    if (Array.isArray(body.candidates)) update.candidates = body.candidates
    if (typeof body.active === 'boolean') update.active = body.active

    if (Object.keys(update).length === 0) {
      return c.json({ error: 'Nothing to update (candidates or active required)' }, 400)
    }

    const result = await db
      .collection<AiModelComboDoc>(COLLECTIONS.aiModelComboConfig)
      .findOneAndUpdate(
        { comboId },
        { $set: { ...update, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )

    if (!result) {
      return c.json({ error: 'Combo not found' }, 404)
    }
    return c.json({ combo: result })
  })

  return router
}
