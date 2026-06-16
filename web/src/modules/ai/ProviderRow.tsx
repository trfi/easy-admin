import { useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical, Pencil, Trash2 } from 'lucide-react'
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
  useDeleteProvider,
  useUpdateProvider,
  type AiProviderView,
} from './ai.api'

export function ProviderRow({
  provider,
  onEdit,
  onTest,
}: {
  provider: AiProviderView
  onEdit: (provider: AiProviderView) => void
  onTest: (provider: AiProviderView) => void
}) {
  const update = useUpdateProvider()
  const del = useDeleteProvider()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function onToggle(active: boolean) {
    update.mutate(
      { providerId: provider.providerId, input: { active } },
      {
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : 'Failed to update provider'
          toast.error(message)
        },
      }
    )
  }

  function onDelete() {
    del.mutate(provider.providerId, {
      onSuccess: () => {
        toast.success(`Provider “${provider.providerId}” deleted`)
        setConfirmOpen(false)
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : 'Failed to delete provider'
        toast.error(message)
        setConfirmOpen(false)
      },
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{provider.name}</TableCell>
      <TableCell className="text-muted-foreground">{provider.providerId}</TableCell>
      <TableCell>
        {provider.configured ? (
          <Badge variant="outline">configured</Badge>
        ) : (
          <Badge variant="secondary">incomplete</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {provider.apiKeyPreview ?? (provider.hasApiKey ? 'set' : '—')}
      </TableCell>
      <TableCell>
        <Switch
          checked={provider.active}
          onCheckedChange={onToggle}
          disabled={update.isPending}
          aria-label={`Toggle ${provider.name}`}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label={`Test ${provider.name}`} onClick={() => onTest(provider)}>
            <FlaskConical className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Edit ${provider.name}`} onClick={() => onEdit(provider)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${provider.name}`} className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete provider “{provider.providerId}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the provider from Hepi. Combos referencing it may stop resolving.
                This cannot be undone.
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
                {del.isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
