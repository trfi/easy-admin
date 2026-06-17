import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Pencil, Trash2 } from 'lucide-react'
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
import {
  useDeleteSelectableModel,
  useUpdateSelectableModel,
  type AiModelComboView,
  type SelectableModelView,
} from './ai.api'

export function SelectableModelRow({
  model,
  onEdit,
  combos,
}: {
  model: SelectableModelView
  onEdit: (model: SelectableModelView) => void
  combos: AiModelComboView[]
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
    <TableRow>
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
      <TableCell>
        <Switch
          checked={model.active}
          onCheckedChange={onToggle}
          disabled={update.isPending}
          aria-label={`Toggle ${model.label}`}
        />
      </TableCell>
      <TableCell className="text-right">
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
