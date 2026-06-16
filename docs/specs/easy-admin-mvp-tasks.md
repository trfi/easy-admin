# Tasks: Easy-Admin MVP

Task breakdown for `docs/specs/easy-admin-mvp-plan.md`. This is the TASKS gate — review before IMPLEMENT.

Tasks are ordered by dependency. Each is a single focused session, ≤ ~5 files. Phase letters map to the plan's dependency graph.

---

## Phase A — Scaffold

- [ ] **A1: Monorepo skeleton + tooling**
  - Acceptance: `web/` and `bff/` workspaces exist; root `package.json` (bun workspaces), shared TS config, prettier/eslint wired, `.env.example` with all keys (`MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, `EASY_API_URL`, `USD_TO_VND_RATE`). No secrets committed.
  - Verify: `bun install` clean; `bun run typecheck` passes on empty skeleton.
  - Files: `package.json`, `tsconfig.base.json`, `.env.example`, `.gitignore`, `web/package.json`, `bff/package.json`

---

## Phase B — BFF foundation

- [ ] **B1: Config loader + Mongo native-driver connection**
  - Acceptance: typed env config; single `MongoClient` connection helper (native driver, not Mongoose); connection-level write allowlist check (only `ai-provider-config` / `ai-model-combo-config` writable — see R5).
  - Verify: unit test — config throws on missing required env; connect helper returns a live `Db` against a test URI.
  - Files: `bff/src/config.ts`, `bff/src/db/client.ts`, `bff/src/db/client.test.ts`

- [ ] **B2: Auth — env-credential login → JWT + requireAuth**
  - Acceptance: `POST /api/auth/login` accepts good credential (compares against `ADMIN_PASSWORD`), returns JWT; rejects bad. `requireAuth` middleware 401s without/with-invalid token.
  - Verify: unit tests — good cred → token; bad cred → 401; protected route → 401 without token, 200 with.
  - Files: `bff/src/auth/login.ts`, `bff/src/auth/requireAuth.ts`, `bff/src/auth/auth.test.ts`, `bff/src/app.ts`

---

## Phase C — BFF read models + endpoints  *(parallel with F)*

- [ ] **C1: Sample real docs + reconcile read models** *(do first — R2)*
  - Acceptance: `AdminUserView` and the payment/AI read shapes reconciled against a sampled real `users` + `payment-history` + `ai-provider-config` doc; any field mismatch vs the spec noted and resolved.
  - Verify: a read-only script prints one sanitized doc per collection; read-model types compile against actual field names.
  - Files: `bff/src/db/readModels.ts`, `bff/scripts/sample-docs.ts`

- [ ] **C2: Revenue endpoints + currency math** *(R4 — 100% coverage)*
  - Acceptance: `GET /api/revenue` (filter status/currency/gateway/date) returns `payment-history` rows + totals split-by-currency; `toUnifiedVnd(totals, rate)` pure fn; reads `payment-history` only, never `point-transaction`.
  - Verify: unit tests at 100% on aggregation + `toUnifiedVnd` with multi-currency fixtures; total reconciles with a manual Mongo aggregation.
  - Files: `bff/src/modules/revenue/revenue.service.ts`, `revenue.routes.ts`, `revenue.service.test.ts`

- [ ] **C3: Users read endpoints**
  - Acceptance: `GET /api/users?q=` returns superset `AdminUserView` (search by email/username/name); `GET /api/users/:id` returns one with points/plan/subscription.
  - Verify: unit test against seeded fixtures — search matches, shape = `AdminUserView`.
  - Files: `bff/src/modules/users/users.service.ts`, `users.routes.ts`, `users.service.test.ts`

- [ ] **C4: AI read endpoints + apiKey strip** *(R3)*
  - Acceptance: `GET /api/ai/providers`, `/api/ai/combos`, `/api/ai/status` return configs/status with `apiKey` stripped at a single serialization boundary.
  - Verify: unit test asserts `apiKey` absent from every payload shape; not logged.
  - Files: `bff/src/modules/ai/ai.service.ts`, `ai.routes.ts`, `ai.service.test.ts`

- [ ] **C5: Overview aggregator**
  - Acceptance: `GET /api/overview` returns revenue-this-month (split + unified VND), active-user count (`updatedAt` within 30d), AI health (total/active/disabled). Composes C2/C3/C4 services — no new business logic.
  - Verify: unit test — aggregator calls underlying services and shapes the KPI payload.
  - Files: `bff/src/modules/overview/overview.service.ts`, `overview.routes.ts`, `overview.service.test.ts`

---

## Phase F — Frontend foundation  *(parallel with C, needs B)*

- [ ] **F1: Vite + React + shadcn + theme**
  - Acceptance: Vite React-TS app; Tailwind + shadcn/ui initialized; light/dark theme toggle that persists (localStorage).
  - Verify: `cd web && bun run build` succeeds; theme toggle flips and survives reload (manual).
  - Files: `web/vite.config.ts`, `web/src/main.tsx`, `web/src/theme/`, `web/components.json`

- [ ] **F2: Sidebar shell + module registry** *(extensibility spine)*
  - Acceptance: `registry.ts` defines `AdminModule { id, label, icon, path, element }`; sidebar renders nav from registry; React Router routes generated from registry. Adding a module = one entry, no shell edits.
  - Verify: code review — 5th-module check (new folder + one registry entry, zero shell changes).
  - Files: `web/src/shell/registry.ts`, `web/src/shell/Sidebar.tsx`, `web/src/shell/AppShell.tsx`, `web/src/router.tsx`

- [ ] **F3: Auth — login page + guard + TanStack Query client**
  - Acceptance: login page posts to B2, stores JWT, attaches it to an api client; route guard redirects unauthenticated to login; TanStack Query configured with the authed fetcher.
  - Verify: login flow works end-to-end against B; protected route redirects when no token (manual + component test).
  - Files: `web/src/auth/LoginPage.tsx`, `web/src/auth/guard.tsx`, `web/src/lib/apiClient.ts`, `web/src/lib/queryClient.ts`

---

## Phase G — Frontend modules  *(each needs its C endpoint + F shell; parallelizable)*

- [ ] **G1: Overview module**
  - Acceptance: KPI cards (revenue split + unified VND, active users, AI health); each card links into its module.
  - Verify: smoke-render with mocked `/api/overview`; reads live data in dev.
  - Files: `web/src/modules/overview/OverviewPage.tsx`, `overview.api.ts`, registry entry

- [ ] **G2: Revenue module**
  - Acceptance: payment-history table with filters (status/currency/gateway/date); totals split-by-currency + unified VND; read-only.
  - Verify: smoke-render with fixtures; filters change the query.
  - Files: `web/src/modules/revenue/RevenuePage.tsx`, `revenue.api.ts`, registry entry

- [ ] **G3: Users module (read)**
  - Acceptance: searchable user list; detail view shows points/plan/subscription. (Adjust form is G5.)
  - Verify: smoke-render; search calls `/api/users?q=`.
  - Files: `web/src/modules/users/UsersPage.tsx`, `UserDetail.tsx`, `users.api.ts`, registry entry

- [ ] **G4: AI module**
  - Acceptance: provider list with live status (failureCount, lastFailureAt, disabledReason); toggle `active`; edit model combo. No apiKey shown anywhere.
  - Verify: smoke-render; toggle flips DB value in dev; no apiKey in any rendered/network payload.
  - Files: `web/src/modules/ai/AiPage.tsx`, `ProviderRow.tsx`, `ComboEditor.tsx`, `ai.api.ts`, registry entry

---

## Phase D — EasyQuiz endpoint  *(ASK FIRST — separate repo)*

- [ ] **D1: serviceAuth middleware + POST /user/:id/points/adjust**
  - Acceptance: `serviceAuth` compares `X-Admin-Secret` to `env.ADMIN_SECRET` (scoped to this route, not `authenticate`/`isAdmin`); route wraps existing `addPermanentPoints` / `addExpiringPoints`; rejects bad key (403), negative/zero/`>10000` (400); `expiring` uses source `admin_adjustment`.
  - Verify: in EasyQuiz repo — endpoint adds points + writes exactly one `Adjustment` transaction; reject paths return correct codes.
  - Files (EasyQuiz repo): `apps/api/src/middleware/service-auth.middleware.ts`, `apps/api/src/routes/user.routes.ts`, `apps/api/src/controllers/user.controller.ts`

---

## Phase E — Points-adjust proxy + adjust form

- [ ] **E1: BFF points-adjust proxy** *(buildable against mock before D lands)*
  - Acceptance: `POST /api/users/:id/points/adjust` validates (positive, ≤10000, mode enum, valid ObjectId) at the boundary, then calls EasyQuiz with `X-Admin-Secret`; propagates errors. Never writes points itself.
  - Verify: unit test against a mocked EasyQuiz endpoint — request shape, validation rejections, error propagation.
  - Files: `bff/src/modules/users/adjust.service.ts`, `adjust.routes.ts`, `adjust.service.test.ts`

- [ ] **E2: Users adjust form (UI)**
  - Acceptance: form on user detail — amount (≤10000, positive), mode (permanent/expiring), reason, optional expiresAt; submits to E1; shows new balance; validation errors surfaced.
  - Verify: interaction test (validation + submit paths); end-to-end in dev — adjustment changes balance and writes one transaction.
  - Files: `web/src/modules/users/AdjustPointsForm.tsx`, `users.api.ts`

---

## Phase H — Docker + Dokploy  *(LAST)*

- [x] **H1: Single-image build + deploy config**
  - Acceptance: multi-stage Dockerfile builds `web/` and has the BFF serve the static bundle + `/api` from one container; Dokploy deploys from the bare Dockerfile (no compose, no captain-definition). Env vars set in the Dokploy UI.
  - Verify: container serves frontend and `/api`; boots against prod Mongo (read-only smoke); global gate green (typecheck + vitest, money-math 100%, no apiKey leak, extensibility check).
  - Files: `Dockerfile`, `.dockerignore`, `bff/src/static.ts`, `scripts/smoke.sh`

---

## Global gate before H
Full `bun run typecheck` + vitest green · money-math coverage 100% · no apiKey in any AI payload · 5th-module extensibility check passed.
