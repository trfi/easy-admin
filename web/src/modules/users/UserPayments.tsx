import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/TablePagination'
import { formatVnd, formatUsd, formatDateTime } from '@/lib/format'
import { useRevenue, type Currency } from '@/modules/revenue/revenue.api'

const LIMIT = 10

function formatAmount(amount: number, currency: Currency): string {
  return currency === 'USD' ? formatUsd(amount) : formatVnd(amount)
}

// Per-user payment history. Reuses the revenue list endpoint with a userId
// filter so the money read path stays in one place (paymenthistories only).
export function UserPayments({ userId }: { userId: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error, isFetching } = useRevenue({ userId }, page, LIMIT)

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load payments: {(error as Error).message}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : data && data.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No payments for this user.
              </TableCell>
            </TableRow>
          ) : (
            data?.rows.map((p) => (
              <TableRow key={p._id}>
                <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                <TableCell>{p.paymentName}</TableCell>
                <TableCell>{p.reason}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(p.amount, p.currency)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {data && data.total > LIMIT && (
        <TablePagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPageChange={setPage}
          disabled={isFetching}
        />
      )}
    </div>
  )
}
