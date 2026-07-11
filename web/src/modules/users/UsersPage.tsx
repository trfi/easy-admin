import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { TablePagination } from '@/components/TablePagination'
import { cn } from '@/lib/utils'
import { useUsers, useUser, useUserStats } from './users.api'
import { UserDetail } from './UserDetail'
import { UserStatsPanel } from './UserStatsPanel'

const DEFAULT_LIMIT = 10

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'))

  const { data, isLoading, isError, error, isFetching, refetch: refetchUsers } = useUsers(query, page, DEFAULT_LIMIT)
  const detail = useUser(selectedId)
  const stats = useUserStats()

  const isRefreshing = isFetching || stats.isFetching || (selectedId ? detail.isFetching : false)

  const handleRefresh = () => {
    refetchUsers()
    stats.refetch()
    if (selectedId) {
      detail.refetch()
    }
  }

  // A deep link from elsewhere (e.g. the revenue payer column) sets ?id=.
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) setSelectedId(id)
  }, [searchParams])

  function select(id: string) {
    setSelectedId(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('id', id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh data"
          className="rounded-full"
        >
          <RotateCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      <UserStatsPanel />

      <Input
        placeholder="Search by email, username, or name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            {isError && (
              <p className="text-sm text-destructive">
                Failed to load users: {(error as Error).message}
              </p>
            )}
            {data?.users.length === 0 && (
              <p className="text-sm text-muted-foreground">No users match that search.</p>
            )}
            {data?.users.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => select(u._id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent',
                  selectedId === u._id && 'border-primary bg-accent'
                )}
              >
                <UserAvatar name={u.name} username={u.username} email={u.email} src={u.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {u.name ?? u.username ?? u.email}
                    </span>
                    {u.role === 'Admin' && <Badge variant="secondary">Admin</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {u.points.total.toLocaleString()} pts · {u.plan?.name ?? 'No plan'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {data && data.total > DEFAULT_LIMIT && (
            <TablePagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              onPageChange={setPage}
              disabled={isFetching}
            />
          )}
        </div>

        <div>
          {selectedId === null && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select a user to view details.
              </CardContent>
            </Card>
          )}
          {selectedId !== null && detail.isLoading && (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
          {detail.data && <UserDetail user={detail.data.user} />}
        </div>
      </div>
    </div>
  )
}
