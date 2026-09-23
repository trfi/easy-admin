import { useState, useMemo, useRef, useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Play, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/apiClient'
import { TestResult } from './TestResult'
import {
  useActivateModel,
  useResetModelFailures,
  useTestProvider,
  type AiModelStatusView,
} from './ai.api'

interface ModelDiagnosticsDialogProps {
  status: AiModelStatusView | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModelDiagnosticsDialog({
  status,
  open,
  onOpenChange,
}: ModelDiagnosticsDialogProps) {
  const activate = useActivateModel()
  const resetFailures = useResetModelFailures()
  const testProvider = useTestProvider()

  const [prompt, setPrompt] = useState('Hello, reply with OK')
  const [mode, setMode] = useState<'auto' | 'generate' | 'stream'>('stream')

  const failuresRef = useRef<HTMLDivElement>(null)
  const [hasScroll, setHasScroll] = useState(false)

  // Parse providerId and modelId from "providerId/modelId"
  const { providerId, modelId } = useMemo(() => {
    if (!status?.model) return { providerId: '', modelId: '' }
    const sepIndex = status.model.indexOf('/')
    if (sepIndex < 0) return { providerId: status.model, modelId: '' }
    return {
      providerId: status.model.slice(0, sepIndex),
      modelId: status.model.slice(sepIndex + 1),
    }
  }, [status?.model])

  // Reverse failures so latest error is displayed on top (capped at 10 logs)
  const failures = useMemo(() => {
    if (!status) return []
    return (
      status.recentFailures && status.recentFailures.length > 0
        ? [...status.recentFailures].reverse()
        : status.lastErrorMessage
          ? [
              {
                code: status.lastErrorCode || 'AI_PROVIDER_MODEL_ERROR',
                message: status.lastErrorMessage,
                timestamp: status.lastFailureAt || new Date().toISOString(),
                comboId: undefined,
              },
            ]
          : []
    ).slice(0, 10)
  }, [status])

  useEffect(() => {
    if (!open || !status) {
      setHasScroll(false)
      return
    }
    const el = failuresRef.current
    if (!el) return

    const checkScroll = () => {
      setHasScroll(el.scrollHeight > el.clientHeight)
    }

    checkScroll()

    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, status, failures])

  if (!status) return null

  const onError = (err: unknown) => {
    toast.error(err instanceof ApiError ? err.message : 'Action failed')
  }

  function onReactivate() {
    if (!status) return
    activate.mutate(
      { model: status.model },
      {
        onSuccess: () => toast.success(`Reactivated ${status.model}`),
        onError,
      }
    )
  }

  function onResetFailures() {
    if (!status) return
    resetFailures.mutate(
      { model: status.model },
      {
        onSuccess: () => toast.success(`Reset failure counter for ${status.model}`),
        onError,
      }
    )
  }

  function onRunTest(e: React.FormEvent) {
    e.preventDefault()
    if (!providerId || !modelId) {
      toast.error('Invalid model identifier')
      return
    }
    testProvider.mutate({
      providerId,
      input: {
        model: modelId,
        mode,
        prompt: prompt.trim() || undefined,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
      >
        <DialogHeader className="border-b px-6 py-3">
          <div className="flex items-center gap-2 pr-10 min-w-0">
            <Activity className="size-5 shrink-0 text-muted-foreground" />
            <DialogTitle
              className="font-mono text-base font-semibold leading-normal truncate"
              title={status.model}
            >
              {status.model}
            </DialogTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              {!status.active ? (
                <Badge variant="destructive">disabled</Badge>
              ) : status.failureCount > 0 ? (
                <Badge variant="secondary">{status.failureCount} failures</Badge>
              ) : (
                <Badge variant="outline">healthy</Badge>
              )}
              {status.disabledReason && (
                <Badge variant="outline" className="font-mono text-xs">
                  {status.disabledReason}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="px-3 py-2 rounded-lg border bg-muted/30 flex flex-col gap-1 justify-center">
              <span className="text-[11px] text-muted-foreground leading-none">Failures</span>
              <span className="text-sm font-semibold font-mono leading-tight">
                {status.failureCount} <span className="text-[11px] text-muted-foreground font-normal">/ 3 max</span>
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border bg-muted/30 flex flex-col gap-1 justify-center">
              <span className="text-[11px] text-muted-foreground leading-none">First Failure</span>
              <span
                className="text-xs font-medium font-mono leading-tight truncate"
                title={status.firstFailureAt ? formatDateTime(status.firstFailureAt) : 'None'}
              >
                {status.firstFailureAt ? formatDateTime(status.firstFailureAt) : '—'}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border bg-muted/30 flex flex-col gap-1 justify-center">
              <span className="text-[11px] text-muted-foreground leading-none">Last Failure</span>
              <span
                className="text-xs font-medium font-mono leading-tight truncate"
                title={status.lastFailureAt ? formatDateTime(status.lastFailureAt) : 'None'}
              >
                {status.lastFailureAt ? formatDateTime(status.lastFailureAt) : '—'}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border bg-muted/30 flex flex-col gap-1 justify-center">
              <span className="text-[11px] text-muted-foreground leading-none">Last Success</span>
              <span
                className="text-xs font-medium font-mono leading-tight truncate"
                title={status.lastSuccessAt ? formatDateTime(status.lastSuccessAt) : 'None'}
              >
                {status.lastSuccessAt ? formatDateTime(status.lastSuccessAt) : '—'}
              </span>
            </div>
          </div>

          {/* Failure Timeline Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">
                  Recent Failures ({failures.length})
                </h4>
              </div>
              {status.failureCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetFailures}
                  disabled={resetFailures.isPending}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn('size-3 mr-1', resetFailures.isPending && 'animate-spin')} />
                  Reset failure counter
                </Button>
              )}
            </div>

            {failures.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/20 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="size-6 text-muted-foreground mb-1" />
                <p className="font-medium text-foreground">No recent errors recorded</p>
                <p className="text-xs">This model is operating normally with no circuit breaker trips.</p>
              </div>
            ) : (
              <div
                ref={failuresRef}
                className={cn(
                  'flex flex-col gap-2.5 max-h-[500px] overflow-y-auto',
                  hasScroll && 'pr-1 pb-3'
                )}
              >
                {failures.map((f, idx) => (
                  <div
                    key={`${f.timestamp}-${idx}`}
                    className="p-3 rounded-lg border bg-muted/10 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs">
                          {f.code}
                        </Badge>
                        {f.comboId && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            combo: {f.comboId}
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-[11px] font-mono">
                        {formatDateTime(f.timestamp)}
                      </span>
                    </div>
                    <pre className="font-mono text-xs bg-background/80 p-2.5 rounded-md border whitespace-pre-wrap break-words text-foreground max-h-32 overflow-y-auto select-all leading-relaxed">
                      {f.message}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Diagnostic Test */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Play className="size-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Live Model Test</h4>
            </div>

            <form onSubmit={onRunTest} className="flex items-center gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Test prompt..."
                className="h-8 flex-1 font-mono text-xs"
              />
              <Select value={mode} onValueChange={(v) => setMode(v as 'auto' | 'generate' | 'stream')}>
                <SelectTrigger className="h-8 w-24 shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stream">stream</SelectItem>
                  <SelectItem value="generate">generate</SelectItem>
                  <SelectItem value="auto">auto</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={testProvider.isPending}
                className="h-8 shrink-0 text-xs"
              >
                {testProvider.isPending ? 'Testing…' : 'Run Test'}
              </Button>
            </form>

            {testProvider.data && (
              <div className="pt-2">
                <TestResult
                  result={testProvider.data.result}
                  model={`${providerId}/${modelId}`}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="m-0 flex flex-row items-center justify-between border-t bg-muted/30 px-6 py-2.5">
          <div>
            {!status.active && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReactivate}
                disabled={activate.isPending}
              >
                Reactivate Model
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
