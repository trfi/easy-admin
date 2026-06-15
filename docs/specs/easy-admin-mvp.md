# Spec: Easy-Admin MVP — Unified Admin Platform for EasyQuiz + Hepi

> Source idea: `docs/ideas/easy-admin.md`. This spec is the source of truth for the MVP build.

## Objective

A standalone admin platform giving the single operator one pane of glass over the shared `easyquiz` MongoDB that backs both EasyQuiz and Hepi. The MVP ships four modules on an extensible module-registry sidebar shell: **Overview**, **Revenue & Payments**, **User Management**, **AI Management**.

**User:** one operator (the owner). No multi-admin, no public surface.

**Success looks like:** the operator can, from one deployed app, see current revenue and AI health at a glance, search any user and adjust their points safely, and toggle/edit AI providers and model combos — without SSHing into a DB or touching either app's codebase.

**Core architectural bet:** the dashboard owns its *own* read models over the shared collections. It never imports EasyQuiz/Hepi Mongoose models, and never reimplements money logic — point mutations are proxied to EasyQuiz's existing service functions.

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind CSS, shadcn/ui, lucide-react icons, React Router, TanStack Query. Light/dark theme.
- **BFF:** Hono on Bun. Native MongoDB driver (`mongodb`), not Mongoose — keeps read models decoupled and avoids Mongoose global model-registry collisions with the apps.
- **Auth:** BFF issues a JWT from an env-configured admin credential. No Google OAuth, no RBAC.
- **DB:** existing shared Mongo at the `easyquiz` database (read-write for AI config, read-only elsewhere). Connection string env-injected.
- **Deploy:** one Docker image on Dokploy (Dockerfile app type, no compose). BFF serves the built static frontend and `/api` from a single process; the only co-located dependencies (Mongo, EasyQuiz api) are external services.

## Commands

```
Install:    bun install
Dev (web):  bun run dev          # Vite dev server, proxies /api to BFF
Dev (bff):  bun run dev:bff      # Hono on Bun, watch mode
Dev (both): bun run dev:full
Build:      bun run build        # builds web, then bundles bff
Typecheck:  bun run typecheck
Lint:       bun run lint
Test:       bun run test         # vitest
Docker:     docker build -t easy-admin .
Smoke test: bash scripts/smoke-test.sh   # builds the image + curls the running container
```

## Project Structure

```
easy-admin/
  web/                      → React + shadcn frontend
    src/
      modules/              → one folder per module (the registry spine)
        overview/
        revenue/
        users/
        ai/
      modules/registry.ts   → central module registry (nav + routes built from this)
      components/           → shared UI (shadcn lives here)
      components/ui/         → shadcn primitives
      lib/                  → api client, query hooks, theme, utils
      app/                  → shell: sidebar, layout, router, theme provider
  bff/                      → Hono + Bun
    src/
      modules/              → mirror of frontend modules: routes + read models per feature
        overview/
        revenue/
        users/
        ai/
      models/               → BFF-owned read-model types + Mongo collection accessors
      middleware/           → requireAuth, error handling, request logging
      lib/                  → mongo client, easyquiz-api client, currency, config
      index.ts              → Hono bootstrap, mounts module routers, serves static web
  docs/
    specs/                  → this spec
    ideas/                  → origin one-pager
  Dockerfile
```

## Code Style

TypeScript throughout. Interfaces over types, explicit return types on exported functions (matches EasyQuiz conventions). Modules are self-contained: a module owns its route handler, its read model, and its frontend folder.

```ts
// bff/src/modules/revenue/revenue.read-model.ts
export interface RevenueByCurrency {
  currency: 'VND' | 'USD'
  total: number
  count: number
}

export interface RevenueSummary {
  byCurrency: RevenueByCurrency[]
  unifiedVnd: number          // all currencies converted to VND at configured rate
  from: string
  to: string
}

export const getRevenueSummary = async (
  from: Date,
  to: Date
): Promise<RevenueSummary> => {
  const byCurrency = await paymentHistory
    .aggregate<RevenueByCurrency>([
      { $match: { status: 'Completed', type: 'Deposit', date: { $gte: from, $lte: to } } },
      { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, currency: '$_id', total: 1, count: 1 } },
    ])
    .toArray()

  return { byCurrency, unifiedVnd: toUnifiedVnd(byCurrency), from: from.toISOString(), to: to.toISOString() }
}
```

Module registry contract — adding a module is one folder + one array entry:

```ts
// web/src/modules/registry.ts
export interface AdminModule {
  id: string
  label: string
  icon: LucideIcon
  path: string            // route base, e.g. "/revenue"
  navOrder: number
  Component: React.ComponentType
}

export const modules: AdminModule[] = [
  overviewModule,
  revenueModule,
  usersModule,
  aiModule,
]
// Sidebar maps over `modules` for nav; router builds routes from `modules`.
```

## API Surface (BFF)

All routes under `/api`, all require `requireAuth` except login. JSON in/out.

**Auth**
- `POST /api/auth/login` `{ username, password }` → `{ token }`
- `GET  /api/auth/me` → `{ username }` (token check)

**Overview**
- `GET /api/overview` → `{ revenue: RevenueSummary (this month), activeUsers: number, ai: { total, active, disabled } }`

**Revenue & Payments**
- `GET /api/payments?status&currency&gateway&from&to&page&limit` → paginated `PaymentHistory` rows
- `GET /api/revenue/summary?from&to` → `RevenueSummary`

**User Management**
- `GET  /api/users?search&plan&page&limit` → paginated superset user view
- `GET  /api/users/:id` → single user detail
- `POST /api/users/:id/points/adjust` `{ amount, mode: 'permanent'|'expiring', reason, expiresAt? }` → **proxies** to EasyQuiz api with `X-Service-Key`

**AI Management**
- `GET   /api/ai/providers` → provider configs **with apiKey stripped**
- `PATCH /api/ai/providers/:providerId` `{ active }` → direct DB write
- `GET   /api/ai/combos` → model-combo configs
- `PATCH /api/ai/combos/:comboId` `{ candidates?, active? }` → direct DB write
- `GET   /api/ai/status` → provider status rows (failureCount, lastFailureAt, disabledReason, …)

## Cross-Repo Contract: EasyQuiz Point-Adjustment Endpoint

A new endpoint in the EasyQuiz api repo (outside this working dir — treated as **ask first**).

- **Route:** `POST /user/:id/points/adjust`
- **Auth:** new `serviceAuth` middleware — compares `X-Service-Key` header to `env.SERVICE_KEY`, scoped to this route only. Does **not** use `authenticate`/`isAdmin` (avoids live-session coupling found in `session-auth.service.ts`).
- **Body:** `{ amount: number, mode: 'permanent' | 'expiring', reason: string, type?: TransactionType, expiresAt?: string }`
- **Amount rules (MVP):** positive only (`amount > 0`), max **10,000** per adjustment. No deductions — negative/zero amounts are rejected at the BFF boundary before the call is made, and again at the endpoint.
- **Behavior:** thin wrapper over existing `apps/api/src/services/points.service.ts`:
  - `mode: 'permanent'` → `addPermanentPoints(id, amount, type ?? 'Adjustment', reason)`
  - `mode: 'expiring'` → `addExpiringPoints(id, amount, type ?? 'Adjustment', 'admin_adjustment', expiresAt)` — the expiration bucket `source` is `admin_adjustment`.
  - Both already call `logTransaction(...)` — no new money logic, no new transaction writes here.
- **Response:** `{ success: true, newBalance: { recurring, permanent, total } }`

## BFF-Owned Read Models

Defined in the BFF, not imported from the apps. The **superset user view** unions fields both apps write to the shared `users` docs:

```ts
export interface AdminUserView {
  _id: string
  name: string
  email: string
  username?: string
  role: 'Admin' | 'User'
  avatar?: string | null
  plan: { name: string; startDate?: Date; endDate?: Date; isTrial: boolean; isLifetime: boolean; packageDuration?: string }
  points: { recurring: number; permanent: number; total: number }
  subscriptionPackage?: string
  isBlacklisted?: boolean
  trialActivatedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

## Testing Strategy

- **Framework:** vitest (BFF + frontend units), React Testing Library (components).
- **BFF priority — the money math:** `revenue` aggregation and `toUnifiedVnd` conversion get unit tests with multi-currency fixtures. Auth (login + `requireAuth`) gets tests for reject/accept paths. The points-adjust proxy is tested against a mocked EasyQuiz endpoint (request shape + error propagation), not the real service.
- **Frontend:** smoke-render each module; the points-adjust form (the only write UX) gets interaction tests including the "save key unchanged" / validation paths.
- **Out of MVP:** e2e/Playwright.
- **Coverage expectation:** 100% on currency conversion and revenue aggregation; reasonable on the rest.

## Boundaries

**Always**
- Strip `apiKey` before returning any provider config to the client.
- Validate inputs at the BFF boundary (amount is finite, `> 0`, and `<= 10,000`; mode is enum; ids are valid ObjectIds).
- Run `bun run typecheck` before any commit.
- Keep the currency rate in config, not inline.

**Ask first**
- Any change to the EasyQuiz repo (the `serviceAuth` middleware + route) — it's a separate repo.
- Any schema/index change to the shared Mongo.
- Adding dependencies beyond the stack above.
- Any direct write to a collection other than `ai-provider-config` / `ai-model-combo-config`.

**Never**
- Return `apiKey` to the client or log it.
- Reimplement points/expiration money logic in the BFF — always proxy.
- Write to `payment-history` or `point-transaction` from the BFF.
- Read revenue from `point-transaction` (365-day TTL → silent data loss).
- Commit `SERVICE_KEY`, `MONGODB_URI`, JWT secret, or admin credential.

## Success Criteria

- [ ] Operator logs in with env credential; bad credential is rejected; all `/api` routes 401 without a valid token.
- [ ] Overview renders revenue (this month, split-by-currency + unified VND), active-user count, and AI health (total/active/disabled), each card linking into its module.
- [ ] Revenue module lists `payment-history` filtered by status/currency/gateway/date, and totals reconcile with a manual Mongo aggregation on the same filter.
- [ ] Unified VND total = sum of each currency × configured rate ($1 = 26,309 VND), verified by unit test.
- [ ] User search returns the superset view; opening a user shows points/plan/subscription.
- [ ] A point adjustment from the UI changes the user's balance in Mongo **and** writes exactly one `PointTransaction` of type `Adjustment` (written by EasyQuiz, not the BFF).
- [ ] AI module lists providers with **no apiKey in any response payload**; toggling `active` flips the DB value; editing a combo persists.
- [ ] `GET /api/ai/status` shows live failure/disable state.
- [ ] Light/dark theme toggle works and persists.
- [ ] App builds to a single Docker image that serves both frontend and `/api`.
- [ ] Adding a hypothetical 5th module requires only a new folder + one `registry.ts` entry (no shell edits) — verified by code review.

## Resolved Decisions

- **"Active users" (Overview metric):** users with `updatedAt` within the last 30 days.
- **Expiring-mode `source` label** for admin grants: `admin_adjustment`.
- **Point adjustment bounds:** positive only, max 10,000 per adjustment. No deductions in MVP.
