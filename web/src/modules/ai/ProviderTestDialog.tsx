import { useEffect, useState } from 'react'
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
import { TestResult } from './TestResult'
import { useTestProvider, type AiProviderView } from './ai.api'

// Runs a live generation against one provider+model. Hepi calls the real model,
// so this is the only place a key is exercised — the result never includes it.
export function ProviderTestDialog({
  open,
  onOpenChange,
  provider,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: AiProviderView
}) {
  const test = useTestProvider()
  const [model, setModel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<'auto' | 'generate' | 'stream'>('stream')

  useEffect(() => {
    if (open) {
      setModel('')
      setPrompt('')
      setMode('stream')
      test.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function onRun(e: React.FormEvent) {
    e.preventDefault()
    if (!model.trim()) return
    test.mutate({
      providerId: provider.providerId,
      input: {
        mode,
        model: model.trim(),
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onRun}>
          <DialogHeader>
            <DialogTitle>Test {provider.name}</DialogTitle>
            <DialogDescription>
              Run a live generation through this provider. Enter a model ID it serves.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="test-model">Model ID</Label>
              <Input
                id="test-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="test-prompt">Prompt (optional)</Label>
              <Input
                id="test-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Say hello"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="test-mode">Mode</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as 'auto' | 'generate' | 'stream')}
              >
                <SelectTrigger id="test-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stream">stream</SelectItem>
                  <SelectItem value="generate">generate</SelectItem>
                  <SelectItem value="auto">auto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {test.isError && (
              <p className="text-sm text-destructive">{(test.error as Error).message}</p>
            )}
            {test.data && (
              <TestResult
                result={test.data.result}
                model={`${test.data.providerId}/${test.data.modelId}`}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={test.isPending || !model.trim()}>
              {test.isPending ? 'Running…' : 'Run test'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
