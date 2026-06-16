import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiTestResult } from './ai.api'

// Renders the outcome of a live provider/combo generation test. Shared by the
// provider test dialog and the combo card so the success/error shape is uniform.
// `model` (e.g. "anthropic/claude-sonnet-4.6") names which candidate actually ran
// — for a fallback combo that is the first candidate that succeeded.
export function TestResult({ result, model }: { result: AiTestResult; model?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3 text-sm',
        result.ok ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          {result.ok ? 'Success' : 'Failed'}
          {result.mode && <span className="text-xs font-normal text-muted-foreground">({result.mode})</span>}
        </div>
        <span className="text-xs text-muted-foreground">{result.elapsedMs} ms</span>
      </div>

      {model && (
        <div className="text-xs text-muted-foreground">
          Model: <span className="font-mono text-foreground">{model}</span>
        </div>
      )}

      {result.ok && result.text && (
        <p className="whitespace-pre-wrap break-words text-muted-foreground">{result.text}</p>
      )}

      {!result.ok && result.error && (
        <p className="break-words text-destructive">
          {result.error.name ? `${result.error.name}: ` : ''}
          {result.error.message}
        </p>
      )}
    </div>
  )
}
