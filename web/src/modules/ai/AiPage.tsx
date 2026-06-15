import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useProviders,
  useCombos,
  useStatus,
  useToggleProvider,
  useUpdateCombo,
  type AiModelComboCandidate,
} from './ai.api'
import { ProviderRow } from './ProviderRow'
import { ComboEditor } from './ComboEditor'

export function AiPage() {
  const providers = useProviders()
  const combos = useCombos()
  const status = useStatus()
  const toggleProvider = useToggleProvider()
  const updateCombo = useUpdateCombo()

  const statusById = new Map((status.data?.status ?? []).map((s) => [s.providerId, s]))

  if (providers.isError) {
    return (
      <p className="text-destructive">
        Failed to load providers: {(providers.error as Error).message}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">AI Management</h2>
        <p className="text-sm text-muted-foreground">
          Providers, live status, and model combos. API keys are never exposed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Last failure</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.isLoading ? (
                <TableRow>
                  <TableHead colSpan={6} className="py-6 text-center font-normal text-muted-foreground">
                    Loading providers…
                  </TableHead>
                </TableRow>
              ) : (providers.data?.providers.length ?? 0) === 0 ? (
                <TableRow>
                  <TableHead colSpan={6} className="py-6 text-center font-normal text-muted-foreground">
                    No providers configured.
                  </TableHead>
                </TableRow>
              ) : (
                providers.data?.providers.map((provider) => (
                  <ProviderRow
                    key={provider.providerId}
                    provider={provider}
                    status={statusById.get(provider.providerId)}
                    toggling={toggleProvider.isPending}
                    onToggle={(active) =>
                      toggleProvider.mutate({ providerId: provider.providerId, active })
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-semibold tracking-tight">Model combos</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {combos.data?.combos.map((combo) => (
            <ComboEditor
              key={combo.comboId}
              combo={combo}
              saving={updateCombo.isPending}
              onToggleCombo={(active) => updateCombo.mutate({ comboId: combo.comboId, active })}
              onToggleCandidate={(candidates: AiModelComboCandidate[]) =>
                updateCombo.mutate({ comboId: combo.comboId, candidates })
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
