# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A standalone single-operator admin dashboard over the shared `easyquiz` MongoDB that backs two external apps (EasyQuiz + Hepi). It is a Bun monorepo with two workspaces: `web` (Vite + React 18 frontend) and `bff` (Hono backend-for-frontend). The full product spec lives at `docs/specs/easy-admin-mvp.md` and is the source of truth.

## Commands

Run from the repo root (`bun run --filter '*'` fans out to both workspaces):

```
bun install                          # install all workspace deps
bun run typecheck                    # tsc --noEmit across web + bff
bun run test                         # vitest run across web + bff
bun run lint                         # eslint .
bun run format                       # prettier --write .
```

Per-workspace (run with `cd web` / `cd bff`, or `bun run --filter @easy-admin/web <script>`):

```
cd web && bun run dev                # Vite dev server on :5173, proxies /api → :3010
cd bff && bun run dev                # Hono on Bun, watch mode, serves :3010
cd web && bun run build              # tsc -b && vite build → web/dist
```

Run a single test file or test:

```
cd bff && bunx vitest run src/modules/revenue/revenue.service.test.ts
cd web && bunx vitest run -t "adjust points"     # filter by test name
```

Docker (single image serves both frontend and `/api`):

```
docker build -t easy-admin .
```

Note: the spec mentions `dev:bff`, `dev:full`, and `scripts/smoke-test.sh` — these do **not** exist. Use the per-workspace `dev` scripts above and run the BFF + web dev servers in two terminals.

## Architecture

### The module registry is the extensibility spine

Both the frontend nav/router and the backend route mounting are derived from per-module folders. Adding a feature is one folder under `modules/` plus one registration — no edits to the shell, router, or app bootstrap.

- Frontend: `web/src/shell/registry.tsx` exports `MODULES: AdminModule[]`. `web/src/shell/Sidebar.tsx` maps over it for nav; `web/src/router.tsx` builds routes from it. Add an entry + a `modules/<name>/` folder.
- Backend: `bff/src/app.ts` mounts each module's routes under `/api/<name>` behind `requireAuth`. Each module is `modules/<name>/<name>.routes.ts` + `<name>.service.ts` (+ `.test.ts`).

The four modules are `overview`, `revenue`, `users`, `ai`. Frontend and backend module folders mirror each other.

### Backend layering (strict)

`routes` (HTTP/Hono) → `service` (business logic + Mongo) → `readModels` (types + `toXView` mappers). Raw Mongo docs (`UserDoc`, `PaymentDoc`) are mapped to view types (`AdminUserView`, `PaymentView`) at the service boundary via the `toXView` functions in `bff/src/db/readModels.ts`. Never pass raw Mongo docs across to routes.

The BFF **owns its own read models** over the shared collections. It never imports the apps' Mongoose models and uses the native `mongodb` driver directly. Collection names in `readModels.ts` `COLLECTIONS` are Mongoose's default pluralizations (e.g. `paymenthistories`) — verified against both source repos, do not guess.

### AI config is owned by Hepi, not the BFF

The `ai` module does **not** read or write the AI-config collections. Every provider/combo operation (list, create, update, delete, reorder, and live test) proxies to Hepi's `/ai-models` admin API via `bff/src/lib/hepiClient.ts`, authenticated with an `X-Admin-Secret` header. Hepi serves that config from a 60s in-memory cache and owns all write invariants (provider-referenced-by-combo guards, duplicate-candidate detection, soft-delete) plus the live-test path (only Hepi has the AI SDK). The BFF validates input at its boundary first (`ai.validate.ts`, mirroring Hepi's zod schemas) so bad requests fail fast. This is the same pattern as the points-adjust proxy to EasyQuiz.

### Hard boundaries (these are load-bearing, not style)

- **`apiKey` stripping**: Hepi never returns a raw `apiKey` (only a masked `apiKeyPreview`). `toProviderView` in `bff/src/modules/ai/ai.service.ts` is the *only* place a Hepi provider DTO crosses into a BFF view, and it re-maps fields explicitly (never spreads) so even a future Hepi change couldn't leak a raw key. Never return or log `apiKey`.
- **DB write guard**: `bff/src/db/client.ts` wraps every collection in a Proxy (`guardCollection`) that throws `WriteNotAllowedError` on any write op. `WRITABLE_COLLECTIONS` is empty — the BFF is fully read-only over Mongo. All writes proxy to EasyQuiz (points) or Hepi (AI config).
- **Points are never mutated locally**: point adjustments proxy to the external EasyQuiz API (`POST /user/:id/points/adjust` with an `X-Admin-Secret` header) — see `bff/src/modules/users/adjust.service.ts`. The money logic + transaction logging live in EasyQuiz, not here. Validate at the BFF boundary first (positive only, max `MAX_ADJUSTMENT` = 10000).
- **Revenue reads `paymenthistories` only**, never `pointtransactions` (which has a 365-day TTL → silent data loss). The currency conversion rule lives in `toUnifiedVnd` (`revenue.service.ts`) and nowhere else; the rate comes from `config.usdToVndRate`, never inlined.

### Config & auth

`bff/src/config.ts` `loadConfig()` validates required env vars at startup and throws if any are missing — see `.env.example`. Auth is a single env-configured admin credential: `POST /api/auth/login` issues a 12h HS256 JWT (`auth/login.ts`); `makeRequireAuth` (`auth/requireAuth.ts`) verifies the bearer token on every `/api/*` route except login.

### Frontend conventions

- Path alias `@/` → `web/src/` (set in both `vite.config.ts` and `vitest.config.ts`).
- `lib/apiClient.ts` `apiFetch` is the authenticated fetch wrapper: attaches the bearer token, throws `ApiError` on non-2xx, and clears the token + redirects on 401. Per-module `*.api.ts` files wrap it with TanStack Query.
- shadcn/ui primitives live in `web/src/components/ui/`. **Add components via the shadcn CLI (`bunx shadcn@latest add ...`), not by hand-writing them.**

### Deployment

One Docker image (`Dockerfile`, multi-stage). Stage 1 builds `web/dist`; stage 2 runs the BFF with Bun executing TypeScript directly (no compile step). When `WEB_DIST` is set (production), `bff/src/static.ts` `mountStatic` serves the built bundle from the same process as `/api`. In dev, Vite serves the UI and proxies `/api` to the BFF.

## Code style

TypeScript throughout, strict mode with `noUncheckedIndexedAccess` and `verbatimModuleSyntax` (so use `import type` for type-only imports). Interfaces over type aliases; explicit return types on exported functions. Keep pure logic (filter builders, summarizers, validators) separate from DB-touching orchestration so it stays unit-testable — see the pure/impure split in `revenue.service.ts`.

## Testing

vitest for both workspaces; React Testing Library + jsdom for components (`web/src/test/setup.ts`, which polyfills `ResizeObserver` for recharts). Highest-priority coverage is the money math (`summarizeGroups` / `toUnifiedVnd` / `collapseSeries`), auth accept/reject paths, the points-adjust proxy and the AI Hepi proxy (both tested against a mocked upstream, not the real service), and the BFF boundary validators (`ai.validate.ts`). Write UX (adjust-points form, provider/combo CRUD dialogs) has interaction tests.

## Ask first

- Any change to the EasyQuiz repo (the `serviceAuth` middleware + `/points/adjust` route) or the Hepi repo (the `/ai-models` admin API + its `X-Admin-Secret` guard) — both are separate repos.
- Any schema/index change to the shared Mongo, or any direct write to a Mongo collection (the BFF is read-only; AI config writes go through Hepi).
- Adding dependencies beyond the existing stack.
