import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { AiModelComboView, AiModelComboCandidate } from './ai.api'

export function ComboEditor({
  combo,
  onToggleCombo,
  onToggleCandidate,
  saving,
}: {
  combo: AiModelComboView
  onToggleCombo: (active: boolean) => void
  onToggleCandidate: (candidates: AiModelComboCandidate[]) => void
  saving: boolean
}) {
  const setCandidateActive = (index: number, active: boolean) => {
    const next = combo.candidates.map((c, i) => (i === index ? { ...c, active } : c))
    onToggleCandidate(next)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {combo.comboId}
          <Badge variant="outline">{combo.strategy}</Badge>
        </CardTitle>
        <Switch
          checked={combo.active}
          onCheckedChange={onToggleCombo}
          disabled={saving}
          aria-label={`Toggle combo ${combo.comboId}`}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {combo.candidates.map((candidate, index) => (
          <div
            key={`${candidate.providerId}:${candidate.modelId}`}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{candidate.modelId}</span>
              <span className="text-xs text-muted-foreground">{candidate.providerId}</span>
            </div>
            <Switch
              checked={candidate.active}
              onCheckedChange={(active) => setCandidateActive(index, active)}
              disabled={saving}
              aria-label={`Toggle candidate ${candidate.modelId}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
