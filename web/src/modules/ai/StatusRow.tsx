import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime } from '@/lib/format'
import {
  useActivateModel,
  useDeactivateModel,
  type AiModelStatusView,
} from './ai.api'

// One per-model status row. The Active switch flips Hepi's manual activation:
// turning it off opens a reason prompt (deactivate); turning it on re-enables and
// clears Hepi's failure bookkeeping. Hepi keys status by "providerId/modelId".
export function StatusRow({ status }: { status: AiModelStatusView }) {
  const activate = useActivateModel()
  const deactivate = useDeactivateModel()
  const [confirmOff, setConfirmOff] = useState(false)
  const [reason, setReason] = useState('')

  const pending = activate.isPending || deactivate.isPending

  const onError = (err: unknown) => {
    toast.error(err instanceof ApiError ? err.message : 'Request failed')
  }

  function onToggle(active: boolean) {
    if (active) {
      activate.mutate(
        { model: status.model },
        { onSuccess: () => toast.success(`Activated ${status.model}`), onError }
      )
    } else {
      setReason('')
      setConfirmOff(true)
    }
  }

  function onConfirmDeactivate() {
    deactivate.mutate(
      { model: status.model, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success(`Deactivated ${status.model}`)
          setConfirmOff(false)
        },
        onError,
      }
    )
  }

  const detail = status.disabledReason ?? status.lastErrorMessage ?? null

  return (
    <TableRow>
      <TableCell className="font-medium">
        <span className="block truncate cursor-default select-all">
          {status.model}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {!status.active ? (
          <Badge variant="destructive">disabled</Badge>
        ) : status.failureCount > 0 ? (
          <Badge variant="secondary" className="whitespace-nowrap">
            {status.failureCount} failures
          </Badge>
        ) : (
          <Badge variant="outline">healthy</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[280px] lg:max-w-[400px] overflow-hidden">
        {detail ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate cursor-default select-all">
                {detail}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md break-words whitespace-pre-wrap font-mono text-xs">
              {detail}
            </TooltipContent>
          </Tooltip>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">{status.failureCount}</TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(status.lastFailureAt)}</TableCell>
      <TableCell>
        <Switch
          checked={status.active}
          onCheckedChange={onToggle}
          disabled={pending}
          aria-label={`Toggle ${status.model}`}
        />
      </TableCell>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate “{status.model}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Hepi will stop routing to this model until it is reactivated. Combos fall back to
              their next candidate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor={`deactivate-reason-${status.model}`}>Reason (optional)</Label>
            <Input
              id={`deactivate-reason-${status.model}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="manual_deactivation"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                onConfirmDeactivate()
              }}
              disabled={deactivate.isPending}
            >
              {deactivate.isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  )
}
