import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Shared page navigator for any server-paginated table (revenue, users).
// Stateless — the parent owns `page` and refetches on change.
export function TablePagination({
  page,
  limit,
  total,
  onPageChange,
  disabled,
}: {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total.toLocaleString()}`}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
