import { useState } from 'react'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { ModelDiagnosticsDialog } from './ModelDiagnosticsDialog'
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
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)

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

  return (
    <>
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
          <div className="flex flex-col gap-1">
            {status.disabledReason && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Reason:</span>
                <Badge variant="outline" className="font-mono text-[11px] px-1.5 py-0 h-4">
                  {status.disabledReason}
                </Badge>
              </div>
            )}
            {status.lastErrorMessage ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setDiagnosticsOpen(true)}
                    className="truncate text-left cursor-pointer font-mono text-xs text-foreground hover:underline max-w-full block"
                    title="Click to view failure diagnostics"
                  >
                    {status.lastErrorCode && (
                      <span className="font-semibold text-muted-foreground mr-1">
                        [{status.lastErrorCode}]
                      </span>
                    )}
                    <span>{status.lastErrorMessage}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md break-words whitespace-pre-wrap font-mono text-xs">
                  {status.lastErrorCode ? `[${status.lastErrorCode}] ` : ''}
                  {status.lastErrorMessage}
                </TooltipContent>
              </Tooltip>
            ) : !status.disabledReason ? (
              <span>—</span>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {status.failureCount > 0 || Boolean(status.recentFailures?.length) ? (
            <button
              type="button"
              onClick={() => setDiagnosticsOpen(true)}
              className="hover:underline font-mono cursor-pointer flex items-center gap-1"
              title="Click to view failure timeline"
            >
              <span>{status.failureCount}</span>
              {Boolean(status.recentFailures?.length) && (
                <span className="text-[11px] text-muted-foreground">
                  ({status.recentFailures?.length} log{status.recentFailures?.length === 1 ? '' : 's'})
                </span>
              )}
            </button>
          ) : (
            <span className="font-mono">{status.failureCount}</span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {formatDateTime(status.lastFailureAt)}
        </TableCell>
        <TableCell>
          <Switch
            checked={status.active}
            onCheckedChange={onToggle}
            disabled={pending}
            aria-label={`Toggle ${status.model}`}
          />
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDiagnosticsOpen(true)}
            title={`View diagnostics for ${status.model}`}
            aria-label={`View diagnostics for ${status.model}`}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Activity className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

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

      <ModelDiagnosticsDialog
        status={status}
        open={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
      />
    </>
  )
}
