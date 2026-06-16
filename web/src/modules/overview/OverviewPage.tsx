import { Link } from 'react-router-dom'
import { DollarSign, Users, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatVnd, formatUsd } from '@/lib/format'
import { RevenueChart } from '@/modules/revenue/RevenueChart'
import { useRevenueSeries } from '@/modules/revenue/revenue.api'
import { useOverview } from './overview.api'

function KpiCard({
  to,
  title,
  icon: Icon,
  children,
}: {
  to: string
  title: string
  icon: typeof DollarSign
  children: React.ReactNode
}) {
  return (
    <Link to={to} className="block transition-opacity hover:opacity-90">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </Link>
  )
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-3 w-40" />
      </CardContent>
    </Card>
  )
}

export function OverviewPage() {
  const { data, isLoading, isError, error } = useOverview()
  // Reuse the revenue series for a trend chart — the money read path stays in one place.
  const series = useRevenueSeries({}, 'month')

  if (isError) {
    return <p className="text-destructive">Failed to load overview: {(error as Error).message}</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">EasyQuiz + Hepi at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading || !data ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard to="/revenue" title="Revenue this month" icon={DollarSign}>
              <div className="text-2xl font-bold">{formatVnd(data.revenueThisMonth.unifiedVnd)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatVnd(data.revenueThisMonth.byCurrency.VND)} +{' '}
                {formatUsd(data.revenueThisMonth.byCurrency.USD)}
                <span className="ml-1">· {data.revenueThisMonth.count} payments</span>
              </p>
            </KpiCard>

            <KpiCard to="/users" title="Active users (30d)" icon={Users}>
              <div className="text-2xl font-bold">{data.activeUsers.toLocaleString()}</div>
              <p className="mt-1 text-xs text-muted-foreground">Updated within last 30 days</p>
            </KpiCard>

            <KpiCard to="/ai" title="AI provider health" icon={Cpu}>
              <div className="text-2xl font-bold">
                {data.aiHealth.active}
                <span className="text-base font-normal text-muted-foreground">
                  /{data.aiHealth.total} active
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.aiHealth.disabled > 0 ? (
                  <span className="text-destructive">{data.aiHealth.disabled} disabled</span>
                ) : (
                  'All providers healthy'
                )}
              </p>
            </KpiCard>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {series.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <RevenueChart points={series.data?.series ?? []} interval="month" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
