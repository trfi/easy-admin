import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import type { AiProviderView, AiProviderStatusView } from './ai.api'

function formatDate(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function ProviderRow({
  provider,
  status,
  onToggle,
  toggling,
}: {
  provider: AiProviderView
  status?: AiProviderStatusView
  onToggle: (active: boolean) => void
  toggling: boolean
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{provider.name}</TableCell>
      <TableCell className="text-muted-foreground">{provider.providerId}</TableCell>
      <TableCell>
        {status ? (
          status.disabledReason ? (
            <Badge variant="destructive">disabled</Badge>
          ) : status.failureCount > 0 ? (
            <Badge variant="secondary">{status.failureCount} failures</Badge>
          ) : (
            <Badge variant="outline">healthy</Badge>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {status?.disabledReason ?? status?.lastErrorMessage ?? '—'}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(status?.lastFailureAt)}</TableCell>
      <TableCell className="text-right">
        <Switch
          checked={provider.active}
          onCheckedChange={onToggle}
          disabled={toggling}
          aria-label={`Toggle ${provider.name}`}
        />
      </TableCell>
    </TableRow>
  )
}
