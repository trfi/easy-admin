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
import { ApiError } from '@/lib/apiClient'
import {
  useCreateProvider,
  useUpdateProvider,
  type AiProviderView,
  type ProviderCreateInput,
  type ProviderUpdateInput,
} from './ai.api'

// Hepi's provider-id rule, mirrored so the field errors before the round-trip.
const PROVIDER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/

// Create + edit share this dialog. `provider` undefined → create mode (providerId
// is editable + required); defined → edit mode (id is locked, apiKey optional so
// leaving it blank keeps the stored key).
export function ProviderDialog({
  open,
  onOpenChange,
  provider,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: AiProviderView
}) {
  const editing = provider !== undefined
  const create = useCreateProvider()
  const update = useUpdateProvider()
  const pending = create.isPending || update.isPending

  const [providerId, setProviderId] = useState('')
  const [name, setName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens or the target provider changes.
  useEffect(() => {
    if (!open) return
    setProviderId(provider?.providerId ?? '')
    setName(provider?.name ?? '')
    setBaseURL(provider?.baseURL ?? '')
    setApiKey('')
    setActive(provider?.active ?? true)
    setError(null)
  }, [open, provider])

  function validate(): string | null {
    if (!editing && !PROVIDER_ID_PATTERN.test(providerId.trim())) {
      return 'Provider ID must be alphanumeric (with _ or -), max 80 chars'
    }
    if (!name.trim()) return 'Name is required'
    try {
      new URL(baseURL.trim())
    } catch {
      return 'Base URL must be a valid URL'
    }
    if (!editing && !apiKey.trim()) return 'API key is required'
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
      // Only send changed fields; an empty apiKey means "keep the existing key".
      const input: ProviderUpdateInput = {}
      if (name.trim() !== provider.name) input.name = name.trim()
      if (baseURL.trim() !== provider.baseURL) input.baseURL = baseURL.trim()
      if (active !== provider.active) input.active = active
      if (apiKey.trim()) input.apiKey = apiKey.trim()
      if (Object.keys(input).length === 0) {
        onOpenChange(false)
        return
      }
      update.mutate(
        { providerId: provider.providerId, input },
        {
          onSuccess: () => {
            toast.success(`Provider “${provider.providerId}” updated`)
            onOpenChange(false)
          },
          onError,
        }
      )
    } else {
      const input: ProviderCreateInput = {
        providerId: providerId.trim(),
        name: name.trim(),
        baseURL: baseURL.trim(),
        apiKey: apiKey.trim(),
        active,
      }
      create.mutate(input, {
        onSuccess: () => {
          toast.success(`Provider “${input.providerId}” created`)
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
            <DialogTitle>{editing ? 'Edit provider' : 'Add provider'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the provider config. Leave the API key blank to keep the current one.'
                : 'Register a new AI provider. The API key is stored by Hepi and never returned.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provider-id">Provider ID</Label>
              <Input
                id="provider-id"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="openai"
                disabled={editing}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provider-name">Name</Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="OpenAI"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provider-baseurl">Base URL</Label>
              <Input
                id="provider-baseurl"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provider-apikey">
                API key{' '}
                {editing && provider.apiKeyPreview && (
                  <span className="text-xs font-normal text-muted-foreground">
                    (current: {provider.apiKeyPreview})
                  </span>
                )}
              </Label>
              <Input
                id="provider-apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={editing ? 'Leave blank to keep current' : 'sk-…'}
                autoComplete="off"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="provider-active">Active</Label>
              <Switch id="provider-active" checked={active} onCheckedChange={setActive} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create provider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
