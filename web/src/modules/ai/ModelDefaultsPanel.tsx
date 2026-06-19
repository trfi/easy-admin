import { forwardRef, useEffect, useMemo, useState, type ElementRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/apiClient'
import {
  useModelDefaults,
  useUpdateChatDefault,
  useUpdateQuizDefaults,
  useUpdateQuizFallbackDefaults,
  type QuizDefaultRole,
  type QuizModelDefaultsView,
  type SelectableModelView,
} from './ai.api'

const QUIZ_DEFAULT_ROLES: Array<{ key: QuizDefaultRole; label: string }> = [
  { key: 'primaryModelFast', label: 'Primary fast' },
  { key: 'primaryModelA', label: 'Primary A' },
  { key: 'primaryModelB', label: 'Primary B' },
  { key: 'tertiaryModel', label: 'Tertiary' },
  { key: 'quaternaryModel', label: 'Quaternary' },
  { key: 'metaJudge', label: 'Meta judge' },
]

interface ModelOption {
  id: string
  label: string
  description: string
}

function describeModel(model: SelectableModelView): string {
  const flags = [model.accessTier, `${model.points} pts`, model.supportsImage ? 'image' : 'text']
  if (!model.active) flags.push('inactive')
  return flags.join(' · ')
}

function buildModelOptions(
  models: SelectableModelView[],
  currentIds: string[]
): ModelOption[] {
  const byId = new Map<string, ModelOption>()
  for (const model of [...models].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))) {
    byId.set(model.id, {
      id: model.id,
      label: `${model.label}${model.active ? '' : ' (inactive)'}`,
      description: `${model.id} · ${describeModel(model)}`,
    })
  }
  for (const id of currentIds) {
    if (id && !byId.has(id)) {
      byId.set(id, {
        id,
        label: `${id} (unknown current model)`,
        description: 'Not found in selectable models',
      })
    }
  }
  return Array.from(byId.values())
}

function getChangedRoles(
  original: QuizModelDefaultsView,
  current: QuizModelDefaultsView
): Partial<Record<QuizDefaultRole, string>> {
  const changed: Partial<Record<QuizDefaultRole, string>> = {}
  for (const { key } of QUIZ_DEFAULT_ROLES) {
    if (current[key] !== original[key]) changed[key] = current[key]
  }
  return changed
}

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Request failed'
}

const SelectItemWithDescription = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    description?: ReactNode
  }
>(({ className, children, description, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <div className="flex flex-col">
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {description && (
        <span className="text-xs text-muted-foreground font-normal mt-0.5">{description}</span>
      )}
    </div>
  </SelectPrimitive.Item>
))
SelectItemWithDescription.displayName = 'SelectItemWithDescription'

function ModelSelect({
  id,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string
  value: string
  options: ModelOption[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || options.length === 0}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItemWithDescription key={option.id} value={option.id} description={option.description}>
            {option.label}
          </SelectItemWithDescription>
        ))}
      </SelectContent>
    </Select>
  )
}

function QuizDefaultsCard({
  title,
  description,
  defaults,
  options,
  pending,
  onSave,
}: {
  title: string
  description: string
  defaults: QuizModelDefaultsView
  options: ModelOption[]
  pending: boolean
  onSave: (
    models: Partial<Record<QuizDefaultRole, string>>,
    callbacks: { onSuccess: () => void; onError: (message: string) => void }
  ) => void
}) {
  const [values, setValues] = useState<QuizModelDefaultsView>(defaults)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValues(defaults)
    setError(null)
  }, [defaults])

  const changed = getChangedRoles(defaults, values)
  const changedCount = Object.keys(changed).length
  const canSave = changedCount > 0 && !pending

  function save() {
    if (changedCount === 0) return
    setError(null)
    onSave(changed, {
      onSuccess: () => setError(null),
      onError: setError,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          {QUIZ_DEFAULT_ROLES.map((role) => (
            <div key={role.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`${title}-${role.key}`}>{role.label}</Label>
              <ModelSelect
                id={`${title}-${role.key}`}
                value={values[role.key]}
                options={options}
                disabled={pending}
                onChange={(value) => setValues((prev) => ({ ...prev, [role.key]: value }))}
              />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={!canSave}>
            {pending ? 'Saving…' : changedCount === 0 ? 'No changes' : `Save ${changedCount} change${changedCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ModelDefaultsPanel({
  selectableModels,
  isSelectableModelsLoading,
}: {
  selectableModels: SelectableModelView[]
  isSelectableModelsLoading: boolean
}) {
  const defaultsQuery = useModelDefaults()
  const updateChat = useUpdateChatDefault()
  const updateQuiz = useUpdateQuizDefaults()
  const updateQuizFallback = useUpdateQuizFallbackDefaults()
  const defaults = defaultsQuery.data?.defaults
  const [chatModel, setChatModel] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!defaults) return
    setChatModel(defaults.chat)
    setError(null)
  }, [defaults])

  const currentIds = useMemo(() => {
    if (!defaults) return []
    return [
      defaults.chat,
      ...QUIZ_DEFAULT_ROLES.map((role) => defaults.quiz[role.key]),
      ...QUIZ_DEFAULT_ROLES.map((role) => defaults.quizFallback[role.key]),
    ]
  }, [defaults])

  const options = useMemo(
    () => buildModelOptions(selectableModels, currentIds),
    [currentIds, selectableModels]
  )

  if (defaultsQuery.isLoading || isSelectableModelsLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (defaultsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load model defaults: {(defaultsQuery.error as Error).message}
      </p>
    )
  }

  if (!defaults) {
    return <p className="text-sm text-muted-foreground">No model defaults returned by Hepi.</p>
  }

  const loadedDefaults = defaults

  function handleError(err: unknown): string {
    const message = errorMessage(err)
    toast.error(message)
    setError(message)
    return message
  }

  function saveChat() {
    if (!chatModel || chatModel === loadedDefaults.chat) return
    setError(null)
    updateChat.mutate(
      { modelId: chatModel },
      {
        onSuccess: () => {
          toast.success('Chat default updated')
        },
        onError: handleError,
      }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className='max-w-[400px]'>
        <CardHeader>
          <CardTitle className="text-base">Chat default</CardTitle>
          <CardDescription>Default selectable model for chat flows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-chat-model">Model</Label>
            <ModelSelect
              id="default-chat-model"
              value={chatModel}
              options={options}
              disabled={updateChat.isPending}
              onChange={setChatModel}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={saveChat}
              disabled={!chatModel || chatModel === loadedDefaults.chat || updateChat.isPending}
            >
              {updateChat.isPending ? 'Saving…' : 'Save chat default'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <QuizDefaultsCard
          title="Quiz defaults"
          description="Primary model roles used for quiz generation. Only changed roles are saved."
          defaults={loadedDefaults.quiz}
          options={options}
          pending={updateQuiz.isPending}
          onSave={(models, callbacks) => {
            updateQuiz.mutate(
              { models },
              {
                onSuccess: () => {
                  toast.success('Quiz defaults updated')
                  callbacks.onSuccess()
                },
                onError: (err) => callbacks.onError(handleError(err)),
              }
            )
          }}
        />
        <QuizDefaultsCard
          title="Quiz fallback defaults"
          description="Fallback model roles used when the primary quiz path needs alternatives."
          defaults={loadedDefaults.quizFallback}
          options={options}
          pending={updateQuizFallback.isPending}
          onSave={(models, callbacks) => {
            updateQuizFallback.mutate(
              { models },
              {
                onSuccess: () => {
                  toast.success('Quiz fallback defaults updated')
                  callbacks.onSuccess()
                },
                onError: (err) => callbacks.onError(handleError(err)),
              }
            )
          }}
        />
      </div>
    </div>
  )
}
