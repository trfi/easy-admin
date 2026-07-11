# Plan: Easy Admin MVP

Implementation plan for `docs/specs/easy-admin-mvp.md`. This is the PLAN gate — reviewable approach, not yet task-level.

## Components & Dependency Graph

```
A. Scaffold (monorepo web/ + bff/, tooling, env)
        │
        ▼
B. BFF foundation ──────────────┐
   (config, Mongo native driver, │
    auth: login→JWT, requireAuth) │
        │                         │
        ▼                         ▼
C. BFF read models +        F. Frontend foundation
   read endpoints              (Vite+React+shadcn, theme,
   (revenue, users, ai,         sidebar shell, module
    overview aggregator)        registry, auth login+guard,
        │                       TanStack Query client)
        │                         │
        │   ┌─────────────────────┘
        ▼   ▼
G. Frontend modules (Overview, Revenue, Users-read, AI)
   — each module pairs a frontend folder with its C endpoint

   ── write path (sequenced separately, see Risk R1) ──
D. EasyQuiz serviceAuth middleware + POST /user/:id/points/adjust  [ASK FIRST — separate repo]
        ▼
E. BFF points-adjust proxy  (can build against a mock until D lands)
        ▼
   Users module adjust form (part of G)

H. Docker single-image build (BFF serves built frontend) → Dokploy  [LAST]
```

## Implementation Order (phases)

1. **A — Scaffold.** Repo layout, package manager, TS config, lint/typecheck wiring, `.env.example`. Checkpoint: `bun run typecheck` passes on empty skeleton.
2. **B — BFF foundation.** Mongo connection via native driver (not Mongoose — avoids model-registry collision), config loader, env-credential login → JWT, `requireAuth`. Checkpoint: login accepts good / rejects bad credential; protected route 401s without token (unit tests).
3. **C — BFF read endpoints.** Read models + revenue (multi-currency + `toUnifiedVnd`), users (superset view + search), ai (config/combos/status, apiKey stripped), overview aggregator. Checkpoint: money-math unit tests at 100%; apiKey never in payload (test).
4. **F — Frontend foundation.** Runs parallel to C once B is done. Shell, registry, theme, auth login + guard. Checkpoint: login flow works against B; 5th-module extensibility check passes by inspection.
5. **G — Frontend modules.** Overview, Revenue, Users (read), AI. Each is independent once its C endpoint + F shell exist — parallelizable. Checkpoint: each module smoke-renders and reads live data.
6. **D — EasyQuiz endpoint.** ASK FIRST. `serviceAuth` middleware + thin route wrapping existing `points.service.ts`. Checkpoint: endpoint adds points + writes exactly one `Adjustment` transaction; rejects bad service key, negative/zero, >10k.
7. **E + adjust form.** BFF proxy (built against a mock earlier; wired to real D here) + Users adjust form. Checkpoint: UI adjustment changes balance and writes one transaction.
8. **H — Docker + Dokploy.** Single image serving frontend + `/api` (no compose, no captain-definition — Dokploy builds straight from the Dockerfile). Checkpoint: container serves both; app boots against prod Mongo (read-only smoke).

## Parallelization

- **Sequential spine:** A → B, then everything fans out.
- **Parallel after B:** C (BFF endpoints) and F (frontend foundation).
- **Parallel within G:** the four modules are independent.
- **Off the critical path:** D/E/adjust-form — the only write path. Build the BFF proxy (E) against a mocked endpoint so frontend/BFF work never blocks on the ask-first EasyQuiz change. Wire to real D when approved.

## Risks & Mitigations

- **R1 — Cross-repo change (D) is ask-first and outside this working dir.** Mitigation: isolate it as the last functional dependency; mock it in E so nothing blocks. Land it in one focused, separately-approved change.
- **R2 — Read models drift from real docs.** The superset `AdminUserView` is hand-unioned from two apps' partial schemas. Mitigation: first task in C samples a real user doc and reconciles fields before building endpoints.
- **R3 — apiKey leakage.** Plaintext in `ai-provider-config`. Mitigation: strip at a single serialization boundary in the ai read model; assert absence in a test, not per-endpoint.
- **R4 — Currency aggregation correctness.** Mitigation: 100% unit coverage on aggregation + conversion with multi-currency fixtures; reconcile against a manual Mongo aggregation in the success criteria.
- **R5 — Writing to the wrong DB / prod safety.** BFF connects to live prod Mongo. Mitigation: BFF only ever writes to `ai-provider-config` / `ai-model-combo-config`; all money writes proxy to EasyQuiz. Enforced in Boundaries + a connection-level allowlist check.

## Verification Checkpoints

Each phase has a gate above. Global gate before H: full `bun run typecheck` + vitest green, money-math coverage 100%, no apiKey in any AI payload, extensibility check passed.
