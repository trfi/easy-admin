import { useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { TestResult } from './TestResult'
import { AddCandidateDialog } from './AddCandidateDialog'
import {
  useDeleteCombo,
  useRemoveComboCandidate,
  useReorderCombo,
  useTestCombo,
  useUpdateCombo,
  type AiModelComboCandidate,
  type AiModelComboView,
  type AiProviderView,
} from './ai.api'

// One combo card: toggle the combo, toggle/reorder/add candidates, run a live test,
// or delete it. All writes proxy to Hepi, which owns ordering and write invariants.
export function ComboEditor({
  combo,
  providers,
}: {
  combo: AiModelComboView
  providers: AiProviderView[]
}) {
  const update = useUpdateCombo()
  const reorder = useReorderCombo()
  const removeCandidate = useRemoveComboCandidate()
  const remove = useDeleteCombo()
  const test = useTestCombo()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [mode, setMode] = useState<'auto' | 'generate' | 'stream'>('stream')

  const saving = update.isPending || reorder.isPending || removeCandidate.isPending

  const onError = (err: unknown) => {
    toast.error(err instanceof ApiError ? err.message : 'Request failed')
  }

  function toggleCombo(active: boolean) {
    update.mutate({ comboId: combo.comboId, input: { active } }, { onError })
  }

  function toggleCandidate(index: number, active: boolean) {
    const candidates = combo.candidates.map(
      (c, i): AiModelComboCandidate => (i === index ? { ...c, active } : c)
    )
    update.mutate({ comboId: combo.comboId, input: { candidates } }, { onError })
  }

  // Hepi's reorder takes a 1-based target position for the moved candidate.
  function moveTo(index: number, target: number) {
    const candidate = combo.candidates[index]
    if (!candidate) return
    if (target < 0 || target >= combo.candidates.length || target === index) return
    reorder.mutate(
      {
        comboId: combo.comboId,
        model: `${candidate.providerId}/${candidate.modelId}`,
        order: target + 1,
      },
      { onError }
    )
  }

  // A fallback combo must keep ≥1 candidate; Hepi rejects removing the last one,
  // and the button is disabled in that case so it never round-trips.
  function onRemoveCandidate(candidate: AiModelComboCandidate) {
    removeCandidate.mutate(
      { comboId: combo.comboId, model: `${candidate.providerId}/${candidate.modelId}` },
      {
        onSuccess: () => toast.success(`Removed ${candidate.providerId}/${candidate.modelId}`),
        onError,
      }
    )
  }

  function onDrop(target: number) {
    const from = dragIndex
    setDragIndex(null)
    setOverIndex(null)
    if (from === null) return
    moveTo(from, target)
  }

  function runTest() {
    test.mutate({ comboId: combo.comboId, input: { mode } }, { onError })
  }

  function onDelete() {
    remove.mutate(combo.comboId, {
      onSuccess: () => {
        toast.success(`Combo “${combo.comboId}” deleted`)
        setConfirmDelete(false)
      },
      onError,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {combo.comboId}
          <Badge variant="outline">{combo.strategy}</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as 'auto' | 'generate' | 'stream')}
            disabled={test.isPending}
          >
            <SelectTrigger className="h-9 w-22" aria-label="Test mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stream">stream</SelectItem>
              <SelectItem value="generate">generate</SelectItem>
              <SelectItem value="auto">auto</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAddOpen(true)}
            disabled={saving || providers.length === 0}
            aria-label={`Add candidate to ${combo.comboId}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={runTest}
            disabled={test.isPending}
            aria-label={`Test combo ${combo.comboId}`}
          >
            <FlaskConical className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete combo ${combo.comboId}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={combo.active}
            onCheckedChange={toggleCombo}
            disabled={saving}
            aria-label={`Toggle combo ${combo.comboId}`}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {combo.candidates.map((candidate, index) => (
          <div
            key={`${candidate.providerId}:${candidate.modelId}`}
            draggable={!saving}
            onDragStart={() => setDragIndex(index)}
            onDragEnter={() => dragIndex !== null && setOverIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            onDragEnd={() => {
              setDragIndex(null)
              setOverIndex(null)
            }}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
              dragIndex === index && 'opacity-50',
              overIndex === index && dragIndex !== index && 'border-primary bg-primary/5'
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <GripVertical
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground',
                  saving ? 'cursor-not-allowed' : 'cursor-grab'
                )}
                aria-hidden
              />
              <span className="text-xs text-muted-foreground">{index + 1}</span>
              <span className="truncate font-medium">{candidate.providerId}/{candidate.modelId}</span>
            </div>
            <div className="flex items-center gap-1">
              <Switch
                checked={candidate.active}
                onCheckedChange={(active) => toggleCandidate(index, active)}
                disabled={saving}
                aria-label={`Toggle candidate ${candidate.modelId}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveCandidate(candidate)}
                disabled={saving || combo.candidates.length <= 1}
                aria-label={`Remove ${candidate.modelId}`}
                title={
                  combo.candidates.length <= 1
                    ? 'A combo must keep at least one candidate'
                    : undefined
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {test.data && (
          <TestResult
            result={test.data.result}
            model={
              test.data.candidate
                ? `${test.data.candidate.providerId}/${test.data.candidate.modelId}`
                : undefined
            }
          />
        )}
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete combo “{combo.comboId}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the combo from Hepi. Any app referencing it will fall back to its
              default. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddCandidateDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        combo={combo}
        providers={providers}
      />
    </Card>
  )
}
