import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/apiClient'
import {
  useAddComboCandidate,
  type AiModelComboView,
  type AiProviderView,
} from './ai.api'

// Append (or insert at a 1-based position) a provider/model candidate to a combo's
// fallback chain. Proxies to Hepi, which owns ordering + the duplicate guard; we
// mirror the duplicate check here so it fails before the round-trip.
export function AddCandidateDialog({
  open,
  onOpenChange,
  combo,
  providers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  combo: AiModelComboView
  providers: AiProviderView[]
}) {
  const add = useAddComboCandidate()
  const [providerId, setProviderId] = useState('')
  const [modelId, setModelId] = useState('')
  const [order, setOrder] = useState('')
  const [error, setError] = useState<string | null>(null)

  const maxOrder = combo.candidates.length + 1

  useEffect(() => {
    if (!open) return
    setProviderId(providers[0]?.providerId ?? '')
    setModelId('')
    setOrder('')
    setError(null)
  }, [open, providers])

  function validate(): string | null {
    if (!providerId) return 'Select a provider'
    if (!modelId.trim()) return 'Enter a model ID'
    if (combo.candidates.some((c) => c.providerId === providerId && c.modelId === modelId.trim())) {
      return `Duplicate candidate: ${providerId}/${modelId.trim()}`
    }
    if (order.trim()) {
      const n = Number(order)
      if (!Number.isInteger(n) || n < 1 || n > maxOrder) {
        return `Order must be a whole number between 1 and ${maxOrder}`
      }
    }
    return null
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)

    const model = `${providerId}/${modelId.trim()}`
    add.mutate(
      { comboId: combo.comboId, model, ...(order.trim() ? { order: Number(order) } : {}) },
      {
        onSuccess: () => {
          toast.success(`Added ${model}`)
          onOpenChange(false)
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : 'Failed to add candidate'
          toast.error(message)
          setError(message)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add candidate to “{combo.comboId}”</DialogTitle>
            <DialogDescription>
              Pick a provider and enter a model it serves. The candidate is appended to the
              fallback chain unless you set a position.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="candidate-provider">Provider</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger id="candidate-provider">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.providerId} value={p.providerId}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="candidate-model">Model ID</Label>
              <Input
                id="candidate-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="claude-sonnet-4.6"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="candidate-order">Position (optional)</Label>
              <Input
                id="candidate-order"
                type="number"
                min={1}
                max={maxOrder}
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                placeholder={`Append (${maxOrder})`}
              />
              <p className="text-xs text-muted-foreground">
                1-based position in the fallback order. Leave blank to append to the end.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? 'Adding…' : 'Add candidate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
