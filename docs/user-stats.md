# User Statistics & Period Selection

The Users module provides top-level KPI summary cards and activity trend charts over user registrations and activity from the shared MongoDB database.

## Selectable Date & Period Cards

The 5 top KPI cards allow the operator to toggle presets or pick custom dates/ranges directly via popover triggers:
- **Card 1 (Active today)**: Defaults to **Today**, switchable to **Yesterday** (0ms latency, precomputed) or a specific day (**Custom Day**) via single-date calendar with dropdown month/year selectors.
- **Card 2 (Active this month)**: Defaults to **This Month**, switchable to **Last Month** (0ms latency, precomputed) or custom date intervals (**Custom Range**) via 2-month range calendar with dropdowns.
- **Card 3 (New today)**: Defaults to **Today**, switchable to **Yesterday** (0ms latency, precomputed) or a specific day (**Custom Day**).
- **Card 4 (New this week)**: Defaults to **This Week**, switchable to **Last Week** (0ms latency, precomputed).
- **Card 5 (New this month)**: Defaults to **This Month**, switchable to **Last Month** (0ms latency, precomputed) or custom date intervals (**Custom Range**).

### Performance & Precomputation
- Standard presets (`today`, `yesterday`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`) are precalculated in parallel by the BFF (`getUserStats`) during the initial fetch. Switching between presets occurs instantly on the client without network requests.
- Selecting a custom date or custom range triggers an on-demand query with `from` and `to` query parameters (`GET /api/users/stats?from=...&to=...`), returning `customActive` and `customNew` counts.

## Dynamic Activity Trend Charts

The two time-series charts (**New users** and **Active users**) support flexible period filtering:
- **Quick Preset Toggles**: `7d`, `30d` (default), and `90d`.
- **Custom Range Selector**: 2-month range calendar with month and year dropdown selectors (`startMonth={2023}`, `endMonth={2030}`).
- **Date Filling**: `fillDateRange` dynamically generates continuous daily data points between `from` and `to` (or the last N days), ensuring smooth bar rendering with zero gaps even for days with zero user registrations or transactions.

## API Specification (`GET /api/users/stats`)

### Query Parameters
- `from` (`string`, optional): ISO date string or `YYYY-MM-DD`. Represents the start of the time range (00:00:00.000 UTC).
- `to` (`string`, optional): ISO date string or `YYYY-MM-DD`. Represents the end of the time range (23:59:59.999 UTC).
- `days` (`number`, optional): Bounded between 1 and 365. Defaults to 30 days when `from`/`to` are omitted.

### Response Payload
```ts
interface UserStats {
  activeToday: number
  activeYesterday: number
  activeThisMonth: number
  activeLastMonth: number
  newToday: number
  newYesterday: number
  newThisWeek: number
  newLastWeek: number
  newThisMonth: number
  newLastMonth: number
  newByDay: UserStatsPoint[]
  activeByDay: UserStatsPoint[]
  customActive?: number
  customNew?: number
}
```
