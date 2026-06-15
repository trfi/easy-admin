import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AdminUserView } from './users.api'
import { AdjustPointsForm } from './AdjustPointsForm'

function formatDate(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export function UserDetail({ user }: { user: AdminUserView }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {user.name ?? user.username ?? user.email}
            {user.role === 'Admin' && <Badge variant="secondary">Admin</Badge>}
            {user.isBlacklisted && <Badge variant="destructive">Blacklisted</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="Username" value={user.username ?? '—'} />
          <Field label="Joined" value={formatDate(user.createdAt)} />
          <Field label="Last updated" value={formatDate(user.updatedAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-sm">
          <Field label="Total" value={user.points.total.toLocaleString()} />
          <Field label="Recurring" value={user.points.recurring.toLocaleString()} />
          <Field label="Permanent" value={user.points.permanent.toLocaleString()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan & subscription</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Plan" value={user.plan?.name ?? '—'} />
          <Field label="Package" value={user.plan?.packageDuration ?? user.subscriptionPackage ?? '—'} />
          <Field label="Plan start" value={formatDate(user.plan?.startDate)} />
          <Field label="Plan end" value={formatDate(user.plan?.endDate)} />
          <Field label="Trial" value={user.plan?.isTrial ? 'Yes' : 'No'} />
          <Field label="Lifetime" value={user.plan?.isLifetime ? 'Yes' : 'No'} />
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
