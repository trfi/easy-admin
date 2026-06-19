import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useProviders,
  useCombos,
  useStatus,
  useSelectableModels,
  type AiProviderView,
  type SelectableModelView,
} from './ai.api'
import { ProviderRow } from './ProviderRow'
import { ProviderDialog } from './ProviderDialog'
import { ProviderTestDialog } from './ProviderTestDialog'
import { ComboEditor } from './ComboEditor'
import { ComboDialog } from './ComboDialog'
import { StatusRow } from './StatusRow'
import { SelectableModelRow } from './SelectableModelRow'
import { SelectableModelDialog } from './SelectableModelDialog'
import { ModelDefaultsPanel } from './ModelDefaultsPanel'

export function AiPage() {
  const providers = useProviders()
  const combos = useCombos()
  const status = useStatus()
  const selectableModels = useSelectableModels()

  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<AiProviderView | undefined>(undefined)
  const [testProvider, setTestProvider] = useState<AiProviderView | null>(null)
  const [comboDialogOpen, setComboDialogOpen] = useState(false)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [editModel, setEditModel] = useState<SelectableModelView | undefined>(undefined)

  function openCreateProvider() {
    setEditProvider(undefined)
    setProviderDialogOpen(true)
  }

  function openEditProvider(provider: AiProviderView) {
    setEditProvider(provider)
    setProviderDialogOpen(true)
  }

  function openCreateModel() {
    setEditModel(undefined)
    setModelDialogOpen(true)
  }

  function openEditModel(model: SelectableModelView) {
    setEditModel(model)
    setModelDialogOpen(true)
  }

  if (providers.isError) {
    return (
      <p className="text-destructive">
        Failed to load providers: {(providers.error as Error).message}
      </p>
    )
  }

  const providerList = providers.data?.providers ?? []
  const statusList = status.data?.status ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">AI Management</h2>
        <p className="text-sm text-muted-foreground">
          Providers, model combos, defaults, and live status. Config proxies to Hepi; API keys are never exposed.
        </p>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="combos">Model combos</TabsTrigger>
          <TabsTrigger value="status">Model status</TabsTrigger>
          <TabsTrigger value="models">Selectable models</TabsTrigger>
          <TabsTrigger value="defaults">Model defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Providers</CardTitle>
              <Button size="sm" onClick={openCreateProvider}>
                <Plus className="mr-1 h-4 w-4" /> Add provider
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider ID</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead>API key</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : providerList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        No providers configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    providerList.map((provider) => (
                      <ProviderRow
                        key={provider.providerId}
                        provider={provider}
                        onEdit={openEditProvider}
                        onTest={setTestProvider}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combos" className="pt-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Model combos</h3>
              <Button
                size="sm"
                onClick={() => setComboDialogOpen(true)}
                disabled={providerList.length === 0}
              >
                <Plus className="mr-1 h-4 w-4" /> Add combo
              </Button>
            </div>
            {combos.isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (combos.data?.combos.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No combos configured.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {combos.data?.combos.map((combo) => (
                  <ComboEditor key={combo.comboId} combo={combo} providers={providerList} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="status" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>Last failure</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : statusList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        No model status recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statusList.map((s) => <StatusRow key={s.model} status={s} />)
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Selectable models</CardTitle>
              <Button size="sm" onClick={openCreateModel}>
                <Plus className="mr-1 h-4 w-4" /> Add model
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Combo</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead>Supports image</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectableModels.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (selectableModels.data?.models.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                        No selectable models configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectableModels.data?.models.map((model) => (
                      <SelectableModelRow
                        key={model.id}
                        model={model}
                        onEdit={openEditModel}
                        combos={combos.data?.combos ?? []}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="pt-4">
          <ModelDefaultsPanel
            selectableModels={selectableModels.data?.models ?? []}
            isSelectableModelsLoading={selectableModels.isLoading}
          />
        </TabsContent>
      </Tabs>

      <ProviderDialog
        open={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        provider={editProvider}
      />
      {testProvider && (
        <ProviderTestDialog
          open={testProvider !== null}
          onOpenChange={(open) => !open && setTestProvider(null)}
          provider={testProvider}
        />
      )}
      <ComboDialog
        open={comboDialogOpen}
        onOpenChange={setComboDialogOpen}
        providers={providerList}
      />
      <SelectableModelDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        model={editModel}
        combos={combos.data?.combos ?? []}
      />
    </div>
  )
}
