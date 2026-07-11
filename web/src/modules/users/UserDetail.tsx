import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/UserAvatar'
import { formatDate } from '@/lib/format'
import type { AdminUserView } from './users.api'
import { AdjustPointsForm } from './AdjustPointsForm'
import { UserPayments } from './UserPayments'
import { UpgradePlanForm } from './UpgradePlanForm'

export function UserDetail({ user }: { user: AdminUserView }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={user.name}
              username={user.username}
              email={user.email}
              src={user.avatar}
              className="h-12 w-12"
            />
            <CardTitle className="flex flex-wrap items-center gap-2">
              {user.name ?? user.username ?? user.email}
              {user.role === 'Admin' && <Badge variant="secondary">Admin</Badge>}
              {user.isBlacklisted && <Badge variant="destructive">Blacklisted</Badge>}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="Username" value={user.username ?? '—'} />
          <Field label="Joined" value={formatDate(user.createdAt)} />
          <Field label="Last updated" value={formatDate(user.updatedAt)} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade plan</TabsTrigger>
          <TabsTrigger value="adjust">Adjust points</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4 pt-4">
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
              <CardTitle className="text-base">Plan &amp; subscription</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Plan" value={user.plan?.name ?? '—'} />
              <Field
                label="Package"
                value={user.plan?.packageDuration ?? user.subscriptionPackage ?? '—'}
              />
              <Field label="Plan start" value={formatDate(user.plan?.startDate)} />
              <Field label="Plan end" value={formatDate(user.plan?.endDate)} />
              <Field label="Trial" value={user.plan?.isTrial ? 'Yes' : 'No'} />
              <Field label="Lifetime" value={user.plan?.isLifetime ? 'Yes' : 'No'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              <UserPayments userId={user._id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upgrade" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upgrade plan</CardTitle>
            </CardHeader>
            <CardContent>
              <UpgradePlanForm user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjust" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adjust points</CardTitle>
            </CardHeader>
            <CardContent>
              <AdjustPointsForm userId={user._id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
