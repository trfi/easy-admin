import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
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
  useCreateCombo,
  type AiProviderView,
  type ComboCandidateInput,
  type ComboCreateInput,
} from './ai.api'

// Hepi's combo-id rule, mirrored so the field errors before the round-trip.
const COMBO_ID_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,79}$/

interface DraftCandidate {
  providerId: string
  modelId: string
}

// Create a fallback combo: an ordered list of provider/model candidates Hepi
// tries in sequence. Providers are picked from the live provider list.
export function ComboDialog({
  open,
  onOpenChange,
  providers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: AiProviderView[]
}) {
  const create = useCreateCombo()
  const [comboId, setComboId] = useState('')
  const [candidates, setCandidates] = useState<DraftCandidate[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setComboId('')
    setCandidates([{ providerId: providers[0]?.providerId ?? '', modelId: '' }])
    setError(null)
  }, [open, providers])

  function setCandidate(index: number, patch: Partial<DraftCandidate>) {
    setCandidates((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function addCandidate() {
    setCandidates((prev) => [...prev, { providerId: providers[0]?.providerId ?? '', modelId: '' }])
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== index))
  }

  function validate(): string | null {
    if (!COMBO_ID_PATTERN.test(comboId.trim())) {
      return 'Combo ID must be lowercase alphanumeric (with _ . -), max 80 chars'
    }
    if (candidates.length === 0) return 'At least one candidate is required'
    const seen = new Set<string>()
    for (const c of candidates) {
      if (!c.providerId) return 'Every candidate needs a provider'
      if (!c.modelId.trim()) return 'Every candidate needs a model ID'
      const key = `${c.providerId}/${c.modelId.trim()}`
      if (seen.has(key)) return `Duplicate candidate: ${key}`
      seen.add(key)
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

    const input: ComboCreateInput = {
      comboId: comboId.trim(),
      candidates: candidates.map(
        (c): ComboCandidateInput => ({ providerId: c.providerId, modelId: c.modelId.trim() })
      ),
    }
    create.mutate(input, {
      onSuccess: () => {
        toast.success(`Combo “${input.comboId}” created`)
        onOpenChange(false)
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : 'Failed to create combo'
        toast.error(message)
        setError(message)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add model combo</DialogTitle>
            <DialogDescription>
              A fallback combo tries each candidate in order until one succeeds.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="combo-id">Combo ID</Label>
              <Input
                id="combo-id"
                value={comboId}
                onChange={(e) => setComboId(e.target.value)}
                placeholder="default"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Candidates (in fallback order)</Label>
              {candidates.map((candidate, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={candidate.providerId}
                    onValueChange={(v) => setCandidate(index, { providerId: v })}
                  >
                    <SelectTrigger className="w-40">
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
                  <Input
                    value={candidate.modelId}
                    onChange={(e) => setCandidate(index, { modelId: e.target.value })}
                    placeholder="model-id"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCandidate(index)}
                    disabled={candidates.length <= 1}
                    aria-label="Remove candidate"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addCandidate} className="self-start">
                <Plus className="mr-1 h-4 w-4" /> Add candidate
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create combo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
