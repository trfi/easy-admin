import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { formatDate } from '@/lib/format'

export type DayPeriod = 'today' | 'yesterday' | 'custom'
export type WeekPeriod = 'thisWeek' | 'lastWeek'
export type MonthPeriod = 'thisMonth' | 'lastMonth' | 'custom'

interface DayPeriodPopoverProps {
  period: DayPeriod
  customDate?: Date
  onChangePeriod: (period: DayPeriod, date?: Date) => void
}

export function DayPeriodPopover({
  period,
  customDate,
  onChangePeriod,
}: DayPeriodPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 gap-0.5 rounded cursor-pointer"
          title="Select date"
        >
          <CalendarIcon className="h-3 w-3" />
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
            <Button
              variant={period === 'today' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 flex-1"
              onClick={() => {
                onChangePeriod('today')
                setOpen(false)
              }}
            >
              Today
            </Button>
            <Button
              variant={period === 'yesterday' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 flex-1"
              onClick={() => {
                onChangePeriod('yesterday')
                setOpen(false)
              }}
            >
              Yesterday
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground pt-0.5 font-medium">
            Or pick a specific date:
          </div>
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(2023, 0)}
            endMonth={new Date(2030, 11)}
            selected={period === 'custom' ? customDate : undefined}
            onSelect={(date) => {
              if (date) {
                onChangePeriod('custom', date)
                setOpen(false)
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface WeekPeriodPopoverProps {
  period: WeekPeriod
  onChangePeriod: (period: WeekPeriod) => void
}

export function WeekPeriodPopover({
  period,
  onChangePeriod,
}: WeekPeriodPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 gap-0.5 rounded cursor-pointer"
          title="Select week"
        >
          <CalendarIcon className="h-3 w-3" />
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2.5" align="start">
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-medium text-muted-foreground px-1 pb-1 border-b border-border/50">
            Select week period:
          </div>
          <Button
            variant={period === 'thisWeek' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7 justify-start"
            onClick={() => {
              onChangePeriod('thisWeek')
              setOpen(false)
            }}
          >
            This Week
          </Button>
          <Button
            variant={period === 'lastWeek' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7 justify-start"
            onClick={() => {
              onChangePeriod('lastWeek')
              setOpen(false)
            }}
          >
            Last Week
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface MonthPeriodPopoverProps {
  period: MonthPeriod
  customRange?: DateRange
  onChangePeriod: (period: MonthPeriod, range?: DateRange) => void
}

export function MonthPeriodPopover({
  period,
  customRange,
  onChangePeriod,
}: MonthPeriodPopoverProps) {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange | undefined>(customRange)

  useEffect(() => {
    if (open) {
      setTempRange(customRange)
    }
  }, [open, customRange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 gap-0.5 rounded cursor-pointer"
          title="Select period"
        >
          <CalendarIcon className="h-3 w-3" />
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border/50 pb-2">
            <Button
              variant={period === 'thisMonth' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                onChangePeriod('thisMonth')
                setOpen(false)
              }}
            >
              This Month
            </Button>
            <Button
              variant={period === 'lastMonth' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                onChangePeriod('lastMonth')
                setOpen(false)
              }}
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const now = new Date()
                const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
                onChangePeriod('custom', { from, to: now })
                setOpen(false)
              }}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const now = new Date()
                const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
                onChangePeriod('custom', { from, to: now })
                setOpen(false)
              }}
            >
              Last 30 Days
            </Button>
          </div>

          <Calendar
            mode="range"
            defaultMonth={tempRange?.from ?? new Date()}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            captionLayout="dropdown"
            startMonth={new Date(2023, 0)}
            endMonth={new Date(2030, 11)}
          />

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <span className="text-muted-foreground">
              {tempRange?.from ? (
                tempRange.to ? (
                  <>
                    Selected: <span className="font-medium text-foreground">{formatDate(tempRange.from.toISOString())}</span> – <span className="font-medium text-foreground">{formatDate(tempRange.to.toISOString())}</span>
                  </>
                ) : (
                  <>Start: <span className="font-medium text-foreground">{formatDate(tempRange.from.toISOString())}</span> (pick end date)</>
                )
              ) : (
                'Pick start and end date'
              )}
            </span>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!tempRange?.from}
              onClick={() => {
                if (tempRange?.from) {
                  onChangePeriod('custom', tempRange)
                  setOpen(false)
                }
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ChartRangePopoverProps {
  customRange?: DateRange
  isCustomActive: boolean
  onApply: (range: DateRange) => void
}

export function ChartRangePopover({
  customRange,
  isCustomActive,
  onApply,
}: ChartRangePopoverProps) {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange | undefined>(customRange)

  useEffect(() => {
    if (open) {
      setTempRange(customRange)
    }
  }, [open, customRange])

  const label =
    isCustomActive && customRange?.from
      ? `${formatDate(customRange.from.toISOString())}${
          customRange.to && customRange.to.getTime() !== customRange.from.getTime()
            ? ` – ${formatDate(customRange.to.toISOString())}`
            : ''
        }`
      : 'Custom'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isCustomActive ? 'default' : 'outline'}
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer"
          title="Select custom date range"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">{label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold text-foreground border-b border-border/50 pb-1.5">
            Select chart date range
          </div>

          <Calendar
            mode="range"
            defaultMonth={tempRange?.from ?? new Date()}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            captionLayout="dropdown"
            startMonth={new Date(2023, 0)}
            endMonth={new Date(2030, 11)}
          />

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <span className="text-muted-foreground">
              {tempRange?.from ? (
                tempRange.to ? (
                  <>
                    Selected: <span className="font-medium text-foreground">{formatDate(tempRange.from.toISOString())}</span> – <span className="font-medium text-foreground">{formatDate(tempRange.to.toISOString())}</span>
                  </>
                ) : (
                  <>Start: <span className="font-medium text-foreground">{formatDate(tempRange.from.toISOString())}</span> (pick end date)</>
                )
              ) : (
                'Pick start and end date'
              )}
            </span>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!tempRange?.from}
              onClick={() => {
                if (tempRange?.from) {
                  onApply(tempRange)
                  setOpen(false)
                }
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
