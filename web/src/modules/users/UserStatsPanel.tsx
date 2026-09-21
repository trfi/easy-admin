import { useState, useMemo } from 'react'
import { Activity, Users, UserPlus, Sparkles, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatDate } from '@/lib/format'
import {
  useUserStats,
  type UserStatsPoint,
  type UserStatsQueryOptions,
} from './users.api'
import { UserStatsCard } from './UserStatsCard'
import {
  DayPeriodPopover,
  WeekPeriodPopover,
  MonthPeriodPopover,
  ChartRangePopover,
  type DayPeriod,
  type WeekPeriod,
  type MonthPeriod,
} from './UserPeriodPopovers'

const NEW_CHART_CONFIG = {
  count: { label: 'New users', color: 'var(--chart-1)' },
} satisfies ChartConfig

const ACTIVE_CHART_CONFIG = {
  count: { label: 'Active users', color: 'var(--chart-1)' },
} satisfies ChartConfig

function formatDateToString(date?: Date): string | undefined {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseStringToDate(str?: string): Date | undefined {
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

function getTodayLabel(): string {
  return formatDate(new Date().toISOString())
}

function getYesterdayLabel(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDate(d.toISOString())
}

function getThisWeekSubtitle(): string {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return `Since ${formatDate(mon.toISOString())}`
}

function getLastWeekSubtitle(): string {
  const now = new Date()
  const day = now.getDay()
  const prevMon = new Date(now)
  prevMon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7)
  const prevSun = new Date(prevMon)
  prevSun.setDate(prevMon.getDate() + 6)
  return `${formatDate(prevMon.toISOString())} – ${formatDate(prevSun.toISOString())}`
}

function getThisMonthLabel(): string {
  const d = new Date()
  return d.toLocaleDateString('vi-VN', {
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

function getLastMonthLabel(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('vi-VN', {
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

function shortDay(date: string): string {
  const parts = date.split('-')
  return parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : date
}

function fillDateRange(
  points: UserStatsPoint[] = [],
  fromStr?: string,
  toStr?: string,
  days = 30
): { date: string; label: string; count: number }[] {
  const map = new Map(points.map((p) => [p.date, p.count]))

  if (fromStr && toStr) {
    const fromDate = parseStringToDate(fromStr)
    const toDate = parseStringToDate(toStr)
    if (fromDate && toDate && fromDate <= toDate) {
      const result: { date: string; label: string; count: number }[] = []
      const curr = new Date(
        Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
      )
      const end = new Date(
        Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
      )

      let guard = 0
      while (curr <= end && guard < 366) {
        const key = curr.toISOString().slice(0, 10)
        result.push({ date: key, label: shortDay(key), count: map.get(key) ?? 0 })
        curr.setUTCDate(curr.getUTCDate() + 1)
        guard++
      }
      return result
    }
  }

  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (days - 1 - i)
      )
    )
    const key = d.toISOString().slice(0, 10)
    return { date: key, label: shortDay(key), count: map.get(key) ?? 0 }
  })
}

function UsersBarChart({
  points,
  config,
  fromStr,
  toStr,
  days,
}: {
  points: UserStatsPoint[]
  config: ChartConfig
  fromStr?: string
  toStr?: string
  days?: number
}) {
  const data = fillDateRange(points, fromStr, toStr, days)
  return (
    <ChartContainer config={config} className="h-[180px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
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

type ChartPreset = '7d' | '30d' | '90d' | 'custom'

export function UserStatsPanel() {
  // Main preloaded stats
  const { data: defaultData, isLoading } = useUserStats()

  // 1. Active Today Card State
  const [activeDayPeriod, setActiveDayPeriod] = useState<DayPeriod>('today')
  const [activeCustomDay, setActiveCustomDay] = useState<Date | undefined>(undefined)
  const activeCustomDayStr =
    activeDayPeriod === 'custom' && activeCustomDay
      ? formatDateToString(activeCustomDay)
      : undefined
  const activeDayQuery = useUserStats(
    activeCustomDayStr
      ? { from: activeCustomDayStr, to: activeCustomDayStr }
      : undefined,
    activeDayPeriod === 'custom' && Boolean(activeCustomDayStr)
  )

  // 2. Active Month Card State
  const [activeMonthPeriod, setActiveMonthPeriod] =
    useState<MonthPeriod>('thisMonth')
  const [activeCustomRange, setActiveCustomRange] = useState<DateRange | undefined>(
    undefined
  )
  const activeRangeFromStr =
    activeMonthPeriod === 'custom' && activeCustomRange?.from
      ? formatDateToString(activeCustomRange.from)
      : undefined
  const activeRangeToStr =
    activeMonthPeriod === 'custom' && activeCustomRange?.from
      ? formatDateToString(activeCustomRange.to ?? activeCustomRange.from)
      : undefined
  const activeMonthQuery = useUserStats(
    activeRangeFromStr
      ? { from: activeRangeFromStr, to: activeRangeToStr }
      : undefined,
    activeMonthPeriod === 'custom' && Boolean(activeRangeFromStr)
  )

  // 3. New Today Card State
  const [newDayPeriod, setNewDayPeriod] = useState<DayPeriod>('today')
  const [newCustomDay, setNewCustomDay] = useState<Date | undefined>(undefined)
  const newCustomDayStr =
    newDayPeriod === 'custom' && newCustomDay
      ? formatDateToString(newCustomDay)
      : undefined
  const newDayQuery = useUserStats(
    newCustomDayStr ? { from: newCustomDayStr, to: newCustomDayStr } : undefined,
    newDayPeriod === 'custom' && Boolean(newCustomDayStr)
  )

  // 4. New Week Card State
  const [newWeekPeriod, setNewWeekPeriod] = useState<WeekPeriod>('thisWeek')

  // 5. New Month Card State
  const [newMonthPeriod, setNewMonthPeriod] = useState<MonthPeriod>('thisMonth')
  const [newCustomRange, setNewCustomRange] = useState<DateRange | undefined>(
    undefined
  )
  const newRangeFromStr =
    newMonthPeriod === 'custom' && newCustomRange?.from
      ? formatDateToString(newCustomRange.from)
      : undefined
  const newRangeToStr =
    newMonthPeriod === 'custom' && newCustomRange?.from
      ? formatDateToString(newCustomRange.to ?? newCustomRange.from)
      : undefined
  const newMonthQuery = useUserStats(
    newRangeFromStr ? { from: newRangeFromStr, to: newRangeToStr } : undefined,
    newMonthPeriod === 'custom' && Boolean(newRangeFromStr)
  )

  // Chart Controls State
  const [chartPreset, setChartPreset] = useState<ChartPreset>('30d')
  const [chartRange, setChartRange] = useState<DateRange | undefined>(undefined)

  const chartQueryOptions = useMemo<UserStatsQueryOptions | undefined>(() => {
    if (chartPreset === '7d') return { days: 7 }
    if (chartPreset === '90d') return { days: 90 }
    if (chartPreset === 'custom' && chartRange?.from) {
      return {
        from: formatDateToString(chartRange.from),
        to: formatDateToString(chartRange.to ?? chartRange.from),
      }
    }
    return undefined
  }, [chartPreset, chartRange])

  const chartStatsQuery = useUserStats(chartQueryOptions, chartPreset !== '30d')
  const chartData = chartPreset === '30d' ? defaultData : chartStatsQuery.data
  const isChartLoading =
    chartPreset === '30d' ? isLoading : chartStatsQuery.isLoading

  // Dynamic Chart Labels & Parameters
  const chartDays =
    chartPreset === '7d' ? 7 : chartPreset === '90d' ? 90 : 30
  const chartFromStr =
    chartPreset === 'custom' && chartRange?.from
      ? formatDateToString(chartRange.from)
      : undefined
  const chartToStr =
    chartPreset === 'custom' && chartRange?.from
      ? formatDateToString(chartRange.to ?? chartRange.from)
      : undefined

  const chartRangeLabel =
    chartPreset === '7d'
      ? '7d'
      : chartPreset === '30d'
      ? '30d'
      : chartPreset === '90d'
      ? '90d'
      : chartRange?.from
      ? `${formatDate(chartRange.from.toISOString())} – ${formatDate(
          (chartRange.to ?? chartRange.from).toISOString()
        )}`
      : 'Custom'

  const chartRangeSubtitle =
    chartPreset === '7d'
      ? 'Last 7 days'
      : chartPreset === '30d'
      ? 'Last 30 days'
      : chartPreset === '90d'
      ? 'Last 90 days'
      : chartRange?.from
      ? `${formatDate(chartRange.from.toISOString())} – ${formatDate(
          (chartRange.to ?? chartRange.from).toISOString()
        )}`
      : 'Custom period'

  // Values and titles for the 5 cards
  // Card 1: Active today
  const activeDayValue =
    activeDayPeriod === 'today'
      ? defaultData?.activeToday ?? 0
      : activeDayPeriod === 'yesterday'
      ? defaultData?.activeYesterday ?? 0
      : activeDayQuery.data?.customActive ?? 0
  const activeDayTitle =
    activeDayPeriod === 'today'
      ? 'Active today'
      : activeDayPeriod === 'yesterday'
      ? 'Active yesterday'
      : 'Active day'
  const activeDaySubtitle =
    activeDayPeriod === 'today'
      ? getTodayLabel()
      : activeDayPeriod === 'yesterday'
      ? getYesterdayLabel()
      : activeCustomDay
      ? formatDate(activeCustomDay.toISOString())
      : 'Select date'
  const isActiveDayLoading =
    activeDayPeriod === 'custom' ? activeDayQuery.isLoading : isLoading

  // Card 2: Active this month
  const activeMonthValue =
    activeMonthPeriod === 'thisMonth'
      ? defaultData?.activeThisMonth ?? 0
      : activeMonthPeriod === 'lastMonth'
      ? defaultData?.activeLastMonth ?? 0
      : activeMonthQuery.data?.customActive ?? 0
  const activeMonthTitle =
    activeMonthPeriod === 'thisMonth'
      ? 'Active this month'
      : activeMonthPeriod === 'lastMonth'
      ? 'Active last month'
      : 'Active range'
  const activeMonthSubtitle =
    activeMonthPeriod === 'thisMonth'
      ? getThisMonthLabel()
      : activeMonthPeriod === 'lastMonth'
      ? getLastMonthLabel()
      : activeCustomRange?.from
      ? `${formatDate(activeCustomRange.from.toISOString())}${
          activeCustomRange.to &&
          activeCustomRange.to.getTime() !== activeCustomRange.from.getTime()
            ? ` – ${formatDate(activeCustomRange.to.toISOString())}`
            : ''
        }`
      : 'Select date range'
  const isActiveMonthLoading =
    activeMonthPeriod === 'custom' ? activeMonthQuery.isLoading : isLoading

  // Card 3: New today
  const newDayValue =
    newDayPeriod === 'today'
      ? defaultData?.newToday ?? 0
      : newDayPeriod === 'yesterday'
      ? defaultData?.newYesterday ?? 0
      : newDayQuery.data?.customNew ?? 0
  const newDayTitle =
    newDayPeriod === 'today'
      ? 'New today'
      : newDayPeriod === 'yesterday'
      ? 'New yesterday'
      : 'New day'
  const newDaySubtitle =
    newDayPeriod === 'today'
      ? getTodayLabel()
      : newDayPeriod === 'yesterday'
      ? getYesterdayLabel()
      : newCustomDay
      ? formatDate(newCustomDay.toISOString())
      : 'Select date'
  const isNewDayLoading =
    newDayPeriod === 'custom' ? newDayQuery.isLoading : isLoading

  // Card 4: New this week
  const newWeekValue =
    newWeekPeriod === 'thisWeek'
      ? defaultData?.newThisWeek ?? 0
      : defaultData?.newLastWeek ?? 0
  const newWeekTitle =
    newWeekPeriod === 'thisWeek' ? 'New this week' : 'New last week'
  const newWeekSubtitle =
    newWeekPeriod === 'thisWeek' ? getThisWeekSubtitle() : getLastWeekSubtitle()

  // Card 5: New this month
  const newMonthValue =
    newMonthPeriod === 'thisMonth'
      ? defaultData?.newThisMonth ?? 0
      : newMonthPeriod === 'lastMonth'
      ? defaultData?.newLastMonth ?? 0
      : newMonthQuery.data?.customNew ?? 0
  const newMonthTitle =
    newMonthPeriod === 'thisMonth'
      ? 'New this month'
      : newMonthPeriod === 'lastMonth'
      ? 'New last month'
      : 'New range'
  const newMonthSubtitle =
    newMonthPeriod === 'thisMonth'
      ? getThisMonthLabel()
      : newMonthPeriod === 'lastMonth'
      ? getLastMonthLabel()
      : newCustomRange?.from
      ? `${formatDate(newCustomRange.from.toISOString())}${
          newCustomRange.to &&
          newCustomRange.to.getTime() !== newCustomRange.from.getTime()
            ? ` – ${formatDate(newCustomRange.to.toISOString())}`
            : ''
        }`
      : 'Select date range'
  const isNewMonthLoading =
    newMonthPeriod === 'custom' ? newMonthQuery.isLoading : isLoading

  if (isLoading && !defaultData) {
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
    <div className="flex flex-col gap-5">
      {/* 5 KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <UserStatsCard
          title={activeDayTitle}
          subtitle={activeDaySubtitle}
          value={activeDayValue}
          icon={Activity}
          isLoading={isActiveDayLoading}
          headerAction={
            <DayPeriodPopover
              period={activeDayPeriod}
              customDate={activeCustomDay}
              onChangePeriod={(p, d) => {
                setActiveDayPeriod(p)
                if (d) setActiveCustomDay(d)
              }}
            />
          }
        />

        <UserStatsCard
          title={activeMonthTitle}
          subtitle={activeMonthSubtitle}
          value={activeMonthValue}
          icon={Users}
          isLoading={isActiveMonthLoading}
          headerAction={
            <MonthPeriodPopover
              period={activeMonthPeriod}
              customRange={activeCustomRange}
              onChangePeriod={(p, r) => {
                setActiveMonthPeriod(p)
                if (r) setActiveCustomRange(r)
              }}
            />
          }
        />

        <UserStatsCard
          title={newDayTitle}
          subtitle={newDaySubtitle}
          value={newDayValue}
          icon={UserPlus}
          isLoading={isNewDayLoading}
          headerAction={
            <DayPeriodPopover
              period={newDayPeriod}
              customDate={newCustomDay}
              onChangePeriod={(p, d) => {
                setNewDayPeriod(p)
                if (d) setNewCustomDay(d)
              }}
            />
          }
        />

        <UserStatsCard
          title={newWeekTitle}
          subtitle={newWeekSubtitle}
          value={newWeekValue}
          icon={Sparkles}
          isLoading={isLoading}
          headerAction={
            <WeekPeriodPopover
              period={newWeekPeriod}
              onChangePeriod={setNewWeekPeriod}
            />
          }
        />

        <UserStatsCard
          title={newMonthTitle}
          subtitle={newMonthSubtitle}
          value={newMonthValue}
          icon={TrendingUp}
          isLoading={isNewMonthLoading}
          headerAction={
            <MonthPeriodPopover
              period={newMonthPeriod}
              customRange={newCustomRange}
              onChangePeriod={(p, r) => {
                setNewMonthPeriod(p)
                if (r) setNewCustomRange(r)
              }}
            />
          }
        />
      </div>

      {/* Charts Section Header with Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Activity Trends
          </h3>
          <p className="text-xs text-muted-foreground">{chartRangeSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={chartPreset}
            onValueChange={(val) => {
              if (val) {
                setChartPreset(val as ChartPreset)
              }
            }}
            className="border rounded-md p-0.5 bg-card/60"
          >
            <ToggleGroupItem value="7d" size="sm" className="h-7 px-2.5 text-xs">
              7d
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" size="sm" className="h-7 px-2.5 text-xs">
              30d
            </ToggleGroupItem>
            <ToggleGroupItem value="90d" size="sm" className="h-7 px-2.5 text-xs">
              90d
            </ToggleGroupItem>
          </ToggleGroup>
          <ChartRangePopover
            customRange={chartRange}
            isCustomActive={chartPreset === 'custom'}
            onApply={(range) => {
              setChartRange(range)
              setChartPreset('custom')
            }}
          />
        </div>
      </div>

      {/* 2 Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              New users ({chartRangeLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <Skeleton className="h-[180px] w-full rounded-md" />
            ) : (
              <UsersBarChart
                points={chartData?.newByDay ?? []}
                config={NEW_CHART_CONFIG}
                fromStr={chartFromStr}
                toStr={chartToStr}
                days={chartDays}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Active users ({chartRangeLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <Skeleton className="h-[180px] w-full rounded-md" />
            ) : (
              <UsersBarChart
                points={chartData?.activeByDay ?? []}
                config={ACTIVE_CHART_CONFIG}
                fromStr={chartFromStr}
                toStr={chartToStr}
                days={chartDays}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
