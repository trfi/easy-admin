import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useUserStats, type UserStatsPoint } from './users.api'

const NEW_CHART_CONFIG = {
  count: { label: 'New signups', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig

const ACTIVE_CHART_CONFIG = {
  count: { label: 'Active users', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig

function shortDay(date: string): string {
  const parts = date.split('-')
  return parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : date
}

function fillDays(points: UserStatsPoint[], days = 30): { date: string; label: string; count: number }[] {
  const map = new Map(points.map((p) => [p.date, p.count]))
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1 - i))
    )
    const key = d.toISOString().slice(0, 10)
    return { date: key, label: shortDay(key), count: map.get(key) ?? 0 }
  })
}

function StatCard({ title, value, sub }: { title: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function UsersBarChart({ points, config }: { points: UserStatsPoint[]; config: ChartConfig }) {
  const data = fillDays(points)
  return (
    <ChartContainer config={config} className="h-[180px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={20}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={28}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

export function UserStatsPanel() {
  const { data, isLoading } = useUserStats()

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Active today" value={data.activeToday} sub="updated today" />
        <StatCard title="Active this month" value={data.activeThisMonth} sub="updated this month" />
        <StatCard title="New today" value={data.newToday} />
        <StatCard title="New this week" value={data.newThisWeek} />
        <StatCard title="New this month" value={data.newThisMonth} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New signups (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersBarChart points={data.newByDay} config={NEW_CHART_CONFIG} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active users (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersBarChart points={data.activeByDay} config={ACTIVE_CHART_CONFIG} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
