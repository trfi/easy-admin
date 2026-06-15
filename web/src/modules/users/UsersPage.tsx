import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUsers, useUser } from './users.api'
import { UserDetail } from './UserDetail'

export function UsersPage() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useUsers(query)
  const detail = useUser(selectedId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">Search the shared EasyQuiz + Hepi user base.</p>
      </div>

      <Input
        placeholder="Search by email, username, or name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading users…</p>}
          {isError && (
            <p className="text-sm text-destructive">Failed to load users: {(error as Error).message}</p>
          )}
          {data?.users.length === 0 && (
            <p className="text-sm text-muted-foreground">No users match that search.</p>
          )}
          {data?.users.map((u) => (
            <button
              key={u._id}
              type="button"
              onClick={() => setSelectedId(u._id)}
              className={cn(
                'rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent',
                selectedId === u._id && 'border-primary bg-accent'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{u.name ?? u.username ?? u.email}</span>
                {u.role === 'Admin' && <Badge variant="secondary">Admin</Badge>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {u.points.total.toLocaleString()} pts · {u.plan?.name ?? 'No plan'}
              </div>
            </button>
          ))}
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
            <p className="text-sm text-muted-foreground">Loading user…</p>
          )}
          {detail.data && <UserDetail user={detail.data.user} />}
        </div>
      </div>
    </div>
  )
}
