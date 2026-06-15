import { Link } from 'react-router-dom'
import { DollarSign, Users, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVnd, formatUsd } from '@/lib/format'
import { useOverview } from './overview.api'

export function OverviewPage() {
  const { data, isLoading, isError, error } = useOverview()

  if (isLoading) {
    return <p className="text-muted-foreground">Loading overview…</p>
  }

  if (isError) {
    return <p className="text-destructive">Failed to load overview: {(error as Error).message}</p>
  }

  const { revenueThisMonth, activeUsers, aiHealth } = data!

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">EasyQuiz + Hepi at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/revenue" className="block transition-opacity hover:opacity-90">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue this month
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVnd(revenueThisMonth.unifiedVnd)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatVnd(revenueThisMonth.byCurrency.VND)} + {formatUsd(revenueThisMonth.byCurrency.USD)}
                <span className="ml-1">· {revenueThisMonth.count} payments</span>
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/users" className="block transition-opacity hover:opacity-90">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active users (30d)
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers.toLocaleString()}</div>
              <p className="mt-1 text-xs text-muted-foreground">Updated within last 30 days</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/ai" className="block transition-opacity hover:opacity-90">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI provider health
              </CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aiHealth.active}
                <span className="text-base font-normal text-muted-foreground">/{aiHealth.total} active</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {aiHealth.disabled > 0 ? (
                  <span className="text-destructive">{aiHealth.disabled} disabled</span>
                ) : (
                  'All providers healthy'
                )}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
