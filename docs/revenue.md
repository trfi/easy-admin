# Revenue & Payments Module

The Revenue & Payments module provides a read-only pane to view payment history from the shared database.

## Redesigned Summary Cards

### Rationale for Combined Card Layout
Previously, the module used three separate cards to show a single metric:
1. Unified Total (VND)
2. VND-only Total
3. USD-only Total

This layout took up excessive horizontal screen space and only showed all-time or filtered totals. We redesigned the cards to show three distinct temporal metrics, each combining its unified total, currency breakdown, and transaction count into a single clean layout:
- **Revenue Today**: Completed transactions for the current UTC day.
- **Revenue This Month**: Completed transactions for the current UTC month.
- **Total / Filtered Revenue**: Matches the active query criteria (all-time if unfiltered).

This combined card layout provides the operator with immediate daily and monthly business health indicators while keeping the UI clean and scannable.

### Selectable Date & Period Cards
The operator can toggle or pick custom dates and periods directly on the summary cards:
- **Card 1 (Daily)**: Defaults to **Today**, with 1-click switcher to **Yesterday** or single-date calendar picker (**Custom Day**).
- **Card 2 (Monthly/Period)**: Defaults to **This Month**, with 1-click switcher to **Last Month** or date-range calendar picker (**Custom Range**).
- **Card 3 (Total)**: Displays **Total / Filtered Revenue**, reflecting the query filters below.

**Performance & Latency**:
- Switching between **Today** and **Yesterday** or **This Month** and **Last Month** has zero network latency (0ms). The BFF pre-computes `todaySummary`, `yesterdaySummary`, `thisMonthSummary`, and `lastMonthSummary` in parallel on the initial revenue fetch.
- Selecting a custom date or custom date range calls `GET /api/revenue/summary?from=...&to=...` on demand.

### Summary API Endpoint (`GET /api/revenue/summary`)
A lightweight summary endpoint returning `{ summary: RevenueSummary }` for arbitrary filter criteria without loading payment rows.
- Accepts `status`, `currency`, `gateway`, `userId`, `from`, and `to`.
- Defaults `status` to `Completed` if omitted.
- Converts single-day `to` filter (`YYYY-MM-DD`) to end-of-day UTC timestamp (`T23:59:59.999Z`) so transactions occurring later in the selected day are accurately captured.

### Filter Behavior & Propagation
The summary cards handle active search filters as follows:
- **Query Criteria Propagation**: Base filters like `userId` (user search), `paymentGateway`, and `currency` propagate to all cards. For instance, filtering by user *Xuân Ngọc* will show that user's revenue for the selected daily/monthly period and total lifetime revenue.
- **Status Defaults**: Daily and monthly revenue cards default to `Completed` status to show actual received revenue rather than pending/failed attempts, unless the user explicitly filters by another status.
- **Date Bounds Isolation**: The table's date range filters (`from` and `to`) only apply to the **Total / Filtered Revenue** card and payment table. They do not overwrite the independent period selections on Card 1 and Card 2.
