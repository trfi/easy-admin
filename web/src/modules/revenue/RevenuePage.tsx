import { useState } from 'react'
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
import { formatVnd, formatUsd } from '@/lib/format'
import {
  useRevenue,
  type RevenueFilters,
  type PaymentStatus,
  type Currency,
  type PaymentGateway,
} from './revenue.api'

const ALL = 'all'

const STATUS_VARIANT: Record<PaymentStatus, 'default' | 'secondary' | 'destructive'> = {
  Completed: 'default',
  Pending: 'secondary',
  Failed: 'destructive',
}

function formatAmount(amount: number, currency: Currency): string {
  return currency === 'USD' ? formatUsd(amount) : formatVnd(amount)
}

export function RevenuePage() {
  const [filters, setFilters] = useState<RevenueFilters>({})
  const { data, isLoading, isError, error } = useRevenue(filters)

  function setFilter<K extends keyof RevenueFilters>(key: K, value: RevenueFilters[K]) {
    setFilters((prev) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Revenue &amp; Payments</h2>
        <p className="text-sm text-muted-foreground">Payment history from the shared database.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unified total (VND)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVnd(data?.summary.unifiedVnd ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">VND</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVnd(data?.summary.byCurrency.VND ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">USD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUsd(data?.summary.byCurrency.USD ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

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

        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Clear
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Loading payments…</p>}
      {isError && (
        <p className="text-destructive">Failed to load payments: {(error as Error).message}</p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No payments match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
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
      )}
    </div>
  )
}
