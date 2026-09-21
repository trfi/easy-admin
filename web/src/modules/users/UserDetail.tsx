import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/UserAvatar'
import { formatDate } from '@/lib/format'
import type { AdminUserView } from './users.api'
import { useActivateTrial } from './users.api'
import { AdjustPointsForm } from './AdjustPointsForm'
import { UserPayments } from './UserPayments'
import { UpgradePlanForm } from './UpgradePlanForm'
import { AppBadge } from './AppBadge'

export function UserDetail({ user }: { user: AdminUserView }) {
  const activateTrial = useActivateTrial()

  const handleActivateTrial = async () => {
    try {
      const result = await activateTrial.mutateAsync(user._id)
      toast.success(result.message || '3-day Premium trial activated successfully (+200 pts)')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate trial')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              name={user.name}
              username={user.username}
              email={user.email}
              src={user.avatar}
              className="h-12 w-12 shrink-0"
            />
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span className="truncate">{user.name ?? user.username ?? user.email}</span>
                {user.role === 'Admin' && <Badge variant="secondary">Admin</Badge>}
                {user.isBlacklisted && <Badge variant="destructive">Blacklisted</Badge>}
                {user.plan?.isTrial && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    Trial
                  </Badge>
                )}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</div>
            </div>
          </div>
          <Button
            variant={user.plan?.isTrial ? 'outline' : 'default'}
            size="sm"
            onClick={handleActivateTrial}
            disabled={activateTrial.isPending}
            className="shrink-0 gap-1.5 self-start sm:self-auto"
          >
            {activateTrial.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-500" />
            )}
            {user.plan?.isTrial ? 'Extend Trial (+3d)' : 'Activate Trial'}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="Username" value={user.username ?? '—'} />
          <Field label="Joined" value={formatDate(user.createdAt)} />
          <Field label="Last updated" value={formatDate(user.updatedAt)} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Source App</span>
            <div className="mt-0.5">
              <AppBadge app={user.sourceApp} />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Last Login App</span>
            <div className="mt-0.5">
              <AppBadge app={user.lastLoginApp} />
            </div>
          </div>
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-xs text-muted-foreground">Connected Apps</span>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {user.connectedApps && user.connectedApps.length > 0 ? (
                user.connectedApps.map((app) => <AppBadge key={app} app={app} />)
              ) : (
                <span className="text-sm font-medium text-muted-foreground">—</span>
              )}
            </div>
          </div>
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
              <Field label="Trial activated at" value={formatDate(user.trialActivatedAt)} />
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
