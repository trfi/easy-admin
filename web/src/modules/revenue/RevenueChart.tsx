import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatVnd, formatVndCompact } from '@/lib/format'
import type { RevenuePoint, SeriesInterval } from './revenue.api'

const CHART_CONFIG = {
  unifiedVnd: { label: 'Revenue (VND)', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig

// Shorten a period label for the X axis: 'YYYY-MM' → 'MM', 'YYYY-MM-DD' → 'DD/MM'.
function shortPeriod(period: string, interval: SeriesInterval): string {
  if (interval === 'month') {
    const parts = period.split('-')
    return parts[1] ? `${parts[1]}/${parts[0]?.slice(2)}` : period
  }
  const parts = period.split('-')
  return parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : period
}

export function RevenueChart({
  points,
  interval,
}: {
  points: RevenuePoint[]
  interval: SeriesInterval
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No revenue in this period.
      </div>
    )
  }

  const data = points.map((p) => ({ ...p, label: shortPeriod(p.period, interval) }))

  return (
    <ChartContainer config={CHART_CONFIG} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-unifiedVnd)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-unifiedVnd)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          tickFormatter={(v: number) => formatVndCompact(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="period"
              formatter={(value) => formatVnd(Number(value))}
            />
          }
        />
        <Area
          dataKey="unifiedVnd"
          type="monotone"
          fill="url(#fillRevenue)"
          stroke="var(--color-unifiedVnd)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
