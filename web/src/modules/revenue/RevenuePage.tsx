import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, Calendar as CalendarIcon, Filter, RotateCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { TablePagination } from '@/components/TablePagination'
import { cn } from '@/lib/utils'
import { formatVnd, formatUsd, formatDate, formatDateTime } from '@/lib/format'
import { RevenueChart } from './RevenueChart'
import {
  useRevenue,
  useRevenueSeries,
  type RevenueFilters,
  type PaymentStatus,
  type Currency,
  type PaymentGateway,
  type SeriesInterval,
} from './revenue.api'

const ALL = 'all'
const DEFAULT_LIMIT = 25

const STATUS_VARIANT: Record<PaymentStatus, 'default' | 'secondary' | 'destructive'> = {
  Completed: 'default',
  Pending: 'secondary',
  Failed: 'destructive',
}

function formatAmount(amount: number, currency: Currency): string {
  return currency === 'USD' ? formatUsd(amount) : formatVnd(amount)
}

interface SummaryCardProps {
  title: string
  summary?: {
    unifiedVnd: number
    byCurrency: { VND: number; USD: number }
    count: number
  }
  icon: React.ComponentType<{ className?: string }>
  gradientClass: string
  borderClass: string
  iconColorClass: string
}

function SummaryCard({
  title,
  summary,
  icon: Icon,
  gradientClass,
  borderClass,
  iconColorClass,
}: SummaryCardProps) {
  return (
    <Card className={`overflow-hidden relative border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 bg-card/60 backdrop-blur-sm ${borderClass}`}>
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-linear-to-r ${gradientClass}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </CardTitle>
        <div className={`p-1.5 rounded-lg bg-secondary/50 border border-muted/50 ${iconColorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="text-3xl font-extrabold tracking-tight text-foreground">
          {formatVnd(summary?.unifiedVnd ?? 0)}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground border-t border-muted/30 pt-2">
          <span className="font-medium text-muted-foreground/90">
            {formatVnd(summary?.byCurrency?.VND ?? 0)} + {formatUsd(summary?.byCurrency?.USD ?? 0)}
          </span>
          <span className="bg-secondary/70 px-2 py-0.5 rounded-full font-medium text-[12px] text-secondary-foreground border border-muted/30">
            {summary?.count ?? 0} {summary?.count === 1 ? 'payment' : 'payments'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

const formatDateToString = (date?: Date) => {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseStringToDate = (str?: string) => {
  if (!str) return undefined
  const parts = str.split('-')
  if (parts.length !== 3) return undefined
  const p0 = parts[0]
  const p1 = parts[1]
  const p2 = parts[2]
  if (p0 === undefined || p1 === undefined || p2 === undefined) return undefined
  const year = parseInt(p0, 10)
  const month = parseInt(p1, 10) - 1
  const day = parseInt(p2, 10)
  return new Date(year, month, day)
}

export function RevenuePage() {
  const [filters, setFilters] = useState<RevenueFilters>({})
  const [page, setPage] = useState(1)
  const [interval, setInterval] = useState<SeriesInterval>('month')

  const { data, isLoading, isError, error, isFetching, refetch: refetchRevenue } = useRevenue(filters, page, DEFAULT_LIMIT)
  const series = useRevenueSeries(filters, interval)

  const isRefreshing = isFetching || series.isFetching

  const handleRefresh = () => {
    refetchRevenue()
    series.refetch()
  }

  function setFilter<K extends keyof RevenueFilters>(key: K, value: RevenueFilters[K]) {
    setPage(1)
    setFilters((prev) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  const summary = data?.summary
  const todaySummary = data?.todaySummary
  const thisMonthSummary = data?.thisMonthSummary

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Revenue &amp; Payments</h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh data"
          className="rounded-full"
        >
          <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Today"
          summary={todaySummary}
          icon={DollarSign}
          gradientClass="from-gray-700 to-gray-600"
          borderClass="hover:border-gray-700/20"
          iconColorClass="text-gray-600"
        />
        <SummaryCard
          title="This Month"
          summary={thisMonthSummary}
          icon={CalendarIcon}
          gradientClass="from-gray-700 to-gray-600"
          borderClass="hover:border-gray-700/20"
          iconColorClass="text-gray-600"
        />
        <SummaryCard
          title="Total"
          summary={summary}
          icon={Filter}
          gradientClass="from-gray-700 to-gray-600"
          borderClass="hover:border-gray-700/20"
          iconColorClass="text-gray-600"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Revenue over time</CardTitle>
          <ToggleGroup
            type="single"
            value={interval}
            onValueChange={(v) => v && setInterval(v as SeriesInterval)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {series.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <RevenueChart points={series.data?.series ?? []} interval={interval} />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => setFilter('status', v === ALL ? undefined : (v as PaymentStatus))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={filters.currency ?? ALL}
          onValueChange={(v) => setFilter('currency', v === ALL ? undefined : (v as Currency))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>All currencies</SelectItem>
              <SelectItem value="VND">VND</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={filters.gateway ?? ALL}
          onValueChange={(v) => setFilter('gateway', v === ALL ? undefined : (v as PaymentGateway))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>All gateways</SelectItem>
              <SelectItem value="Bank">Bank</SelectItem>
              <SelectItem value="Wallet">Wallet</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="flex flex-col gap-1">
          <Label htmlFor="revenue-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="revenue-from"
                variant="outline"
                className={cn(
                  "w-40 justify-start text-left font-normal",
                  !filters.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon data-icon="inline-start" />
                {filters.from ? formatDate(filters.from) : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseStringToDate(filters.from)}
                onSelect={(date) => setFilter('from', formatDateToString(date))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="revenue-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="revenue-to"
                variant="outline"
                className={cn(
                  "w-40 justify-start text-left font-normal",
                  !filters.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon data-icon="inline-start" />
                {filters.to ? formatDate(filters.to) : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseStringToDate(filters.to)}
                onSelect={(date) => setFilter('to', formatDateToString(date))}
              />
            </PopoverContent>
          </Popover>
        </div>

        {Object.keys(filters).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({})
              setPage(1)
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {isError && (
        <p className="text-destructive">Failed to load payments: {(error as Error).message}</p>
      )}

      <div className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data && data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No payments match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data?.rows.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell>
                    {p.payer ? (
                      <Link
                        to={`/users?id=${p.userId}`}
                        className="font-medium hover:underline"
                        title={p.payer.email}
                      >
                        {p.payer.name ?? p.payer.email ?? p.userId}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{p.paymentName}</TableCell>
                  <TableCell>{p.paymentGateway}</TableCell>
                  <TableCell>{p.reason}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(p.amount, p.currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data && data.total > 0 && (
          <TablePagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onPageChange={setPage}
            disabled={isFetching}
          />
        )}
      </div>
    </div>
  )
}
