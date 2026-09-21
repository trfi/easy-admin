import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function formatAppName(app?: string | null): string {
  if (!app) return '—'
  switch (app.toLowerCase()) {
    case 'easyquiz':
      return 'EasyQuiz'
    case 'hepi':
      return 'Hepi'
    case 'extension':
      return 'Extension'
    case 'search':
      return 'Search'
    default:
      return app.charAt(0).toUpperCase() + app.slice(1)
  }
}

const APP_STYLES: Record<string, string> = {
  easyquiz: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  hepi: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  extension: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
  search: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
}

export function AppBadge({
  app,
  className,
}: {
  app?: string | null
  className?: string
}) {
  if (!app) {
    return <span className="text-sm font-medium text-muted-foreground">—</span>
  }

  const key = app.toLowerCase()
  const customStyle = APP_STYLES[key] ?? 'border-border bg-muted/60 text-foreground'

  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs px-2 py-0.5', customStyle, className)}
    >
      {formatAppName(app)}
    </Badge>
  )
}
