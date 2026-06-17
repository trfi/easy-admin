import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '../../app'
import type { Config } from '../../config'
import { HepiUpstreamError } from '../../lib/hepiClient'
import {
  AiValidationError,
  validateComboAddCandidate,
  validateComboRemoveCandidate,
  validateComboCreate,
  validateComboId,
  validateComboReorder,
  validateComboUpdate,
  validateModelStatusInput,
  validateProviderCreate,
  validateProviderId,
  validateProviderUpdate,
  validateSelectableModelCreate,
  validateSelectableModelId,
  validateSelectableModelUpdate,
  validateTest,
} from './ai.validate'
import {
  activateModel,
  addComboCandidate,
  removeComboCandidate,
  createCombo,
  createProvider,
  createSelectableModel,
  deactivateModel,
  deleteCombo,
  deleteProvider,
  deleteSelectableModel,
  listCombos,
  listProviders,
  listSelectableModels,
  listStatus,
  reorderComboCandidate,
  testCombo,
  testProvider,
  updateCombo,
  updateProvider,
  updateSelectableModel,
} from './ai.service'

// Run a handler that may throw AiValidationError (→400) or HepiUpstreamError
// (→ pass the upstream status through, clamped to a sane range). Anything else
// bubbles to the app-level error handler.
async function guard(
  c: { json: (body: unknown, status?: ContentfulStatusCode) => Response },
  fn: () => Promise<Response>
): Promise<Response> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof AiValidationError) {
      return c.json({ error: err.message }, 400)
    }
    if (err instanceof HepiUpstreamError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 502
      return c.json({ error: err.message, code: err.code }, status as ContentfulStatusCode)
    }
    throw err
  }
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  const body = await c.req.json().catch(() => ({}))
  return (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
}

export function aiRoutes(config: Config): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  // ── Providers ──
  router.get('/providers', (c) => guard(c, async () => c.json({ providers: await listProviders(config) })))

  router.post('/providers', (c) =>
    guard(c, async () => {
      const input = validateProviderCreate(await readJson(c))
      return c.json({ provider: await createProvider(input, config) }, 201)
    })
  )

  router.patch('/providers/:providerId', (c) =>
    guard(c, async () => {
      const providerId = validateProviderId(c.req.param('providerId'))
      const input = validateProviderUpdate(await readJson(c))
      return c.json({ provider: await updateProvider(providerId, input, config) })
    })
  )

  router.delete('/providers/:providerId', (c) =>
    guard(c, async () => {
      const providerId = validateProviderId(c.req.param('providerId'))
      await deleteProvider(providerId, config)
      return c.json({ success: true })
    })
  )

  router.post('/providers/:providerId/test', (c) =>
    guard(c, async () => {
      const providerId = validateProviderId(c.req.param('providerId'))
      const input = validateTest(await readJson(c), true)
      return c.json(await testProvider(providerId, input, config))
    })
  )

  // ── Combos ──
  router.get('/combos', (c) => guard(c, async () => c.json({ combos: await listCombos(config) })))

  router.post('/combos', (c) =>
    guard(c, async () => {
      const input = validateComboCreate(await readJson(c))
      return c.json({ combo: await createCombo(input, config) }, 201)
    })
  )

  router.patch('/combos/:comboId', (c) =>
    guard(c, async () => {
      const comboId = validateComboId(c.req.param('comboId'))
      const input = validateComboUpdate(await readJson(c))
      return c.json({ combo: await updateCombo(comboId, input, config) })
    })
  )

  router.delete('/combos/:comboId', (c) =>
    guard(c, async () => {
      const comboId = validateComboId(c.req.param('comboId'))
      await deleteCombo(comboId, config)
      return c.json({ success: true })
    })
  )

  router.post('/combos/:comboId/reorder', (c) =>
    guard(c, async () => {
      const comboId = validateComboId(c.req.param('comboId'))
      const input = validateComboReorder(await readJson(c))
      return c.json({ combo: await reorderComboCandidate(comboId, input, config) })
    })
  )

  router.post('/combos/:comboId/candidates', (c) =>
    guard(c, async () => {
      const comboId = validateComboId(c.req.param('comboId'))
      const input = validateComboAddCandidate(await readJson(c))
      return c.json({ combo: await addComboCandidate(comboId, input, config) })
    })
  )

  router.delete('/combos/:comboId/candidates', (c) =>
    guard(c, async () => {
      const comboId = validateComboId(c.req.param('comboId'))
      const input = validateComboRemoveCandidate(await readJson(c))
      return c.json({ combo: await removeComboCandidate(comboId, input, config) })
    })
  )

  router.post('/combos/:comboId/test', (c) =>
    guard(c, async () => {
      const comboId = validateComboId(c.req.param('comboId'))
      const input = validateTest(await readJson(c), false)
      return c.json(await testCombo(comboId, input, config))
    })
  )

  // ── Per-model status ──
  router.get('/status', (c) => guard(c, async () => c.json({ status: await listStatus(config) })))

  router.post('/status/activate', (c) =>
    guard(c, async () => {
      const { model } = validateModelStatusInput(await readJson(c))
      return c.json({ status: await activateModel(model, config) })
    })
  )

  router.post('/status/deactivate', (c) =>
    guard(c, async () => {
      const { model, reason } = validateModelStatusInput(await readJson(c))
      return c.json({ status: await deactivateModel(model, reason, config) })
    })
  )

  // ── Selectable models ──
  router.get('/selectable-models', (c) =>
    guard(c, async () => c.json({ models: await listSelectableModels(config) }))
  )

  router.post('/selectable-models', (c) =>
    guard(c, async () => {
      const input = validateSelectableModelCreate(await readJson(c))
      return c.json({ model: await createSelectableModel(input, config) }, 201)
    })
  )

  router.patch('/selectable-models/:id', (c) =>
    guard(c, async () => {
      const id = validateSelectableModelId(c.req.param('id'))
      const input = validateSelectableModelUpdate(await readJson(c))
      return c.json({ model: await updateSelectableModel(id, input, config) })
    })
  )

  router.delete('/selectable-models/:id', (c) =>
    guard(c, async () => {
      const id = validateSelectableModelId(c.req.param('id'))
      await deleteSelectableModel(id, config)
      return c.json({ success: true })
    })
  )

  return router
}
