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

### Filter Behavior & Propagation
The summary cards handle active search filters as follows:
- **Query Criteria Propagation**: Base filters like `userId` (user search), `paymentGateway`, and `currency` propagate to all three cards. For instance, filtering by user *Xuân Ngọc* will show that user's revenue today, this month, and their total lifetime revenue.
- **Status Defaults**: Today's and this month's revenue cards default to `Completed` status to show actual received revenue rather than pending/failed attempts, unless the user explicitly filters by another status.
- **Date Bounds Isolation**: The date range filters (`from` and `to`) only apply to the **Filtered Revenue** card. They are ignored by the **Revenue Today** and **Revenue This Month** cards to prevent them from showing zero when the selected date range does not include the current date.
