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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/apiClient'
import {
  useCreateSelectableModel,
  useUpdateSelectableModel,
  type AiModelComboView,
  type SelectableModelView,
  type SelectableModelCreateInput,
  type SelectableModelUpdateInput,
} from './ai.api'

export function SelectableModelDialog({
  open,
  onOpenChange,
  model,
  combos,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: SelectableModelView
  combos: AiModelComboView[]
}) {
  const editing = model !== undefined
  const create = useCreateSelectableModel()
  const update = useUpdateSelectableModel()
  const pending = create.isPending || update.isPending

  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [points, setPoints] = useState('0')
  const [accessTier, setAccessTier] = useState('')
  const [comboId, setComboId] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [supportsImage, setSupportsImage] = useState(false)
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setId(model?.id ?? '')
    setLabel(model?.label ?? '')
    setPoints(String(model?.points ?? 0))
    setAccessTier(model?.accessTier ?? '')
    setComboId(model?.comboId ?? '')
    setSortOrder(String(model?.sortOrder ?? 0))
    setSupportsImage(model?.supportsImage ?? false)
    setActive(model?.active ?? true)
    setError(null)
  }, [open, model])

  function validate(): string | null {
    if (!id.trim()) return 'ID is required'
    if (!label.trim()) return 'Label is required'
    const pts = parseInt(points, 10)
    if (isNaN(pts) || pts < 0) return 'Points must be a non-negative integer'
    if (!accessTier.trim()) return 'Access tier is required'
    if (!comboId) return 'Combo is required'
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

    const onError = (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Request failed'
      toast.error(message)
      setError(message)
    }

    if (editing) {
      const nextId = id.trim()
      const input: SelectableModelUpdateInput = {}
      if (nextId !== model.id) input.id = nextId
      if (label.trim() !== model.label) input.label = label.trim()
      const pts = parseInt(points, 10)
      if (pts !== model.points) input.points = pts
      if (accessTier.trim() !== model.accessTier) input.accessTier = accessTier.trim()
      if (comboId !== model.comboId) input.comboId = comboId
      if (parseInt(sortOrder, 10) !== model.sortOrder) input.sortOrder = parseInt(sortOrder, 10)
      if (supportsImage !== model.supportsImage) input.supportsImage = supportsImage
      if (active !== model.active) input.active = active
      if (Object.keys(input).length === 0) {
        onOpenChange(false)
        return
      }
      update.mutate(
        { id: model.id, input },
        {
          onSuccess: ({ model: updatedModel }) => {
            toast.success(`Model "${updatedModel.id}" updated`)
            onOpenChange(false)
          },
          onError,
        }
      )
    } else {
      const input: SelectableModelCreateInput = {
        id: id.trim(),
        label: label.trim(),
        points: parseInt(points, 10),
        accessTier: accessTier.trim(),
        comboId,
        sortOrder: parseInt(sortOrder, 10),
        supportsImage,
        active,
      }
      create.mutate(input, {
        onSuccess: () => {
          toast.success(`Model "${input.id}" created`)
          onOpenChange(false)
        },
        onError,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit selectable model' : 'Add selectable model'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the model configuration.'
                : 'Add a new model to the selectable list shown to users.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-id">ID</Label>
              <Input
                id="sm-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="claude-sonnet-4.6"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-label">Label</Label>
              <Input
                id="sm-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Claude Sonnet 4.6"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-points">Points per request</Label>
              <Input
                id="sm-points"
                type="number"
                min="0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-tier">Access tier</Label>
              <Input
                id="sm-tier"
                value={accessTier}
                onChange={(e) => setAccessTier(e.target.value)}
                placeholder="free"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-combo">Combo</Label>
              <Select value={comboId} onValueChange={setComboId}>
                <SelectTrigger id="sm-combo">
                  <SelectValue placeholder="Select a combo" />
                </SelectTrigger>
                <SelectContent>
                  {combos.map((c) => (
                    <SelectItem key={c.comboId} value={c.comboId}>
                      {c.comboId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-sort">Sort order</Label>
              <Input
                id="sm-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sm-image">Supports image</Label>
              <Switch id="sm-image" checked={supportsImage} onCheckedChange={setSupportsImage} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sm-active">Active</Label>
              <Switch id="sm-active" checked={active} onCheckedChange={setActive} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add model'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
