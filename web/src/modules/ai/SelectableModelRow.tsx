import { useState } from 'react'
import { toast } from 'sonner'
import { Check, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
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
import {
  useDeleteSelectableModel,
  useUpdateSelectableModel,
  type AiModelComboView,
  type SelectableModelView,
} from './ai.api'

export function SelectableModelRow({
  model,
  index,
  onEdit,
  combos,
  isDragging,
  isOver,
  disabled,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  model: SelectableModelView
  index: number
  onEdit: (model: SelectableModelView) => void
  combos: AiModelComboView[]
  isDragging?: boolean
  isOver?: boolean
  disabled?: boolean
  onDragStart?: (index: number) => void
  onDragEnter?: (index: number) => void
  onDrop?: (index: number) => void
  onDragEnd?: () => void
}) {
  const update = useUpdateSelectableModel()
  const del = useDeleteSelectableModel()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const combo = combos.find((c) => c.comboId === model.comboId)

  function onToggle(active: boolean) {
    update.mutate(
      { id: model.id, input: { active } },
      {
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : 'Failed to update model'
          toast.error(message)
        },
      }
    )
  }

  function onDelete() {
    del.mutate(model.id, {
      onSuccess: () => {
        toast.success(`Model "${model.id}" removed`)
        setConfirmOpen(false)
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : 'Failed to delete model'
        toast.error(message)
        setConfirmOpen(false)
      },
    })
  }

  return (
    <TableRow
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(index)
      }}
      onDragEnter={() => onDragEnter?.(index)}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop?.(index)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'transition-colors',
        isDragging && 'opacity-40 bg-muted/40',
        isOver && !isDragging && 'border-t-2 border-primary bg-primary/5'
      )}
    >
      <TableCell className="w-8 py-0 pl-3 pr-0">
        <div className="flex items-center">
          <GripVertical
            className={cn(
              'h-4 w-4 text-muted-foreground transition-opacity',
              disabled
                ? 'cursor-not-allowed opacity-40'
                : 'cursor-grab active:cursor-grabbing hover:text-foreground'
            )}
            aria-label="Drag to reorder"
          />
        </div>
      </TableCell>
      <TableCell className="font-medium">{model.label}</TableCell>
      <TableCell className="text-muted-foreground">{model.id}</TableCell>
      <TableCell>
        {combo ? (
          <Badge variant="outline">{combo.comboId}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{model.accessTier}</Badge>
      </TableCell>
      <TableCell>{model.points}</TableCell>
      <TableCell>{model.sortOrder}</TableCell>
      <TableCell>
        {model.supportsImage ? (
          <Check className="h-4 w-4 text-muted-foreground" aria-label="Yes" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell onMouseDown={(e) => e.stopPropagation()}>
        <Switch
          checked={model.active}
          onCheckedChange={onToggle}
          disabled={update.isPending}
          aria-label={`Toggle ${model.label}`}
        />
      </TableCell>
      <TableCell className="text-right" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${model.label}`} onClick={() => onEdit(model)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${model.label}`}
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove model "{model.id}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the model from the selectable list. Users assigned to this model may lose access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  onDelete()
                }}
                disabled={del.isPending}
              >
                {del.isPending ? 'Removing…' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
