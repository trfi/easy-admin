# Easy Admin — Unified Admin Platform for EasyQuiz + Hepi

## Problem Statement
**How might we** give the operator a single, extensible admin platform over the shared `easyquiz` database — to monitor revenue/payments, manage the user base, and actively control AI providers/models — without coupling the dashboard to either app's internal Mongoose models?

## Recommended Direction
A **standalone modular admin platform**: React + shadcn/ui frontend with a thin BFF (Hono/Bun) that owns its *own* read models over the shared Mongo. Ship as one Docker image on Dokploy, alongside the existing EasyQuiz/Hepi services, pointed at the same `15.235.192.183:27020/easyquiz`.

The architecture leads with a **sidebar shell + module registry**, not a monolithic dashboard. Each module (Overview, Revenue, Users, AI Management) is a self-contained feature folder — route + BFF endpoints + read model — registered into a central nav. Adding "Audit Logs" or "Feature Flags" later is dropping in a new folder and one registry entry, not surgery.

The **Overview module** is the landing route: KPI cards (revenue this month split by currency, active users, AI provider health) that link into the dependent modules. It is a thin aggregator over the other modules' read endpoints — not a place where new business logic lives. This keeps the "single pane of glass" benefit while preserving the registry as the architectural spine.

**Write policy** follows the "BFF proxies risky writes" choice, split by blast radius:
- **Direct DB writes** — pure config with no money/points side effects: AI provider `active` toggle, model-combo edits, force re-enable a disabled provider.
- **Proxied through real app APIs** — anything touching money or balances: issuing/adjusting points, refunds. These run business logic (expirations, transaction logging) the dashboard must not reimplement.

**Point-adjustment endpoint (decided: build one).** The service logic already exists in EasyQuiz `apps/api/src/services/points.service.ts` — `addPermanentPoints(userId, amount, type, reason)` and `addExpiringPoints(...)`, both of which already call `logTransaction(...)` so the money-math and audit trail are correct. But no admin HTTP route exposes them (`user.routes.ts` has admin create/update/delete, no points route). So the first build task is a thin `POST /user/:id/points/adjust` in EasyQuiz api (authenticate + isAdmin) that wraps these existing functions — no new money logic, just exposure. The BFF proxies to it.

**Auth (decided: env credential + JWT).** The dashboard issues its own JWT from an env-configured admin credential — no Google OAuth, no multi-admin. One consequence: EasyQuiz's `isAdmin` middleware expects a real Admin-role JWT, so the BFF must hold an EasyQuiz admin service token (env-injected) to call the new points endpoint on the operator's behalf.

## Key Assumptions to Validate
- [ ] **PaymentHistory is the revenue source of truth, not PointTransaction.** `point-transaction` has a **365-day TTL index** — rows auto-delete. Revenue reporting *must* aggregate `payment-history` (no TTL). Validate by checking oldest doc in each collection.
- [ ] **Revenue is multi-currency (VND + USD).** Can't naively `sum(amount)`. Decided: support both views — show split-by-currency, and a unified total converted to VND at a fixed rate of **$1 = 26,309 VND** (store the rate as config so it's adjustable, not hardcoded inline).
- [ ] **No canonical user schema exists** — EasyQuiz (auth app) and Hepi each define partial models over the same `users` docs. The dashboard must define its own superset read model. Validate by sampling a real user doc for the union of fields.
- [ ] **AI `apiKey` is stored plaintext** in `ai-provider-config` (stripped only on `toJSON`). BFF must *never* return it to the client and must support write-without-readback. Validate the edit-provider UX handles "save key unchanged."
- [ ] **AI models already exist server-side in Hepi** — `ai-provider-config`, `ai-model-combo-config`, `ai-provider-status` all live in the shared DB. This module *exposes existing collections*, not greenfield. Validate they're populated in prod.

## MVP Scope
**In:** Sidebar app shell (light/dark) + module registry. Single-admin login (env-based credential → JWT). Four modules:
- **Overview** — landing route. KPI cards: revenue this month by currency, active user count, AI provider health summary. Each card links into its module. Read-only aggregation.
- **Revenue & Payments** — payment-history table (filter by status/currency/gateway/date), revenue totals split by currency, read-only.
- **User Management** — list/search users, view points/plan/subscription, point adjustment via *proxied* API call.
- **AI Management** — provider list with live status (failureCount, lastFailure, disabledReason), toggle/edit providers, and edit model combos through Hepi-owned admin APIs.

**Out:** Multi-admin RBAC, write-back to payments, time-series charts/analytics, content management.

## Not Doing (and Why)
- **Importing EasyQuiz/Hepi Mongoose models** — couples the dashboard to their internal churn. Own read models instead.
- **Reimplementing points/refund logic in the BFF** — money math lives in the real services; proxy to them.
- **Reading revenue from point-transactions** — TTL means silent data loss past 1 year.
- **Multi-tenant/role system now** — single admin confirmed; building RBAC is premature.
- **Collapsing everything into one dashboard page** — Overview summarizes and links out; it does not absorb the modules.

## Resolved Decisions
- **Point-adjustment endpoint** — service logic exists (`addPermanentPoints`, `addExpiringPoints`), but no admin route. Build `POST /user/:id/points/adjust` in EasyQuiz api; BFF proxies to it.
- **VND+USD** — show split-by-currency *and* a unified VND total converted at $1 = 26,309 VND (rate stored as adjustable config).
- **Auth** — env-credential → JWT for single admin. BFF holds an EasyQuiz admin service token to call the points endpoint.

## Open Questions
- None blocking. First build task: the `POST /user/:id/points/adjust` endpoint, since it gates User Management's only write action.
