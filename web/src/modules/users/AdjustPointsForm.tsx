import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAdjustPoints, type AdjustMode } from './users.api'
import { ApiError } from '@/lib/apiClient'

const MAX_ADJUSTMENT = 10000

export function AdjustPointsForm({ userId }: { userId: string }) {
  const adjust = useAdjustPoints()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<AdjustMode>('permanent')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const validate = (): string | null => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return 'Amount must be a positive number'
    if (n > MAX_ADJUSTMENT) return `Amount must not exceed ${MAX_ADJUSTMENT.toLocaleString()}`
    if (!reason.trim()) return 'Reason is required'
    if (mode === 'expiring' && !expiresAt) return 'Expiry date is required for expiring points'
    return null
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)

    adjust.mutate(
      {
        userId,
        amount: Number(amount),
        mode,
        reason: reason.trim(),
        ...(mode === 'expiring' ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      },
      {
        onSuccess: (data) => {
          toast.success(`Points granted. New total: ${data.newBalance.total.toLocaleString()}`)
          setAmount('')
          setReason('')
          setExpiresAt('')
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : 'Failed to adjust points'
          toast.error(message)
          setError(message)
        },
      }
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={error?.includes('Amount') || undefined}>
          <FieldLabel htmlFor="adjust-amount">Amount</FieldLabel>
          <Input
            id="adjust-amount"
            type="number"
            min={1}
            max={MAX_ADJUSTMENT}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={error?.includes('Amount') || undefined}
            placeholder="e.g. 500"
          />
          <FieldDescription>Positive grants only, up to {MAX_ADJUSTMENT.toLocaleString()}.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Mode</FieldLabel>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as AdjustMode)}
            variant="outline"
          >
            <ToggleGroupItem value="permanent">Permanent</ToggleGroupItem>
            <ToggleGroupItem value="expiring">Expiring</ToggleGroupItem>
          </ToggleGroup>
        </Field>

        {mode === 'expiring' && (
          <Field data-invalid={error?.includes('Expiry') || undefined}>
            <FieldLabel htmlFor="adjust-expires">Expires at</FieldLabel>
            <Input
              id="adjust-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              aria-invalid={error?.includes('Expiry') || undefined}
            />
          </Field>
        )}

        <Field data-invalid={error?.includes('Reason') || undefined}>
          <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
          <Input
            id="adjust-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={error?.includes('Reason') || undefined}
            placeholder="e.g. Support compensation"
          />
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Button type="submit" disabled={adjust.isPending}>
          {adjust.isPending ? 'Granting…' : 'Grant points'}
        </Button>
      </FieldGroup>
    </form>
  )
}
