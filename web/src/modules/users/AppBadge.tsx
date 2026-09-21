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

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-xs px-2 py-0.5 border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/60',
        className
      )}
    >
      {formatAppName(app)}
    </Badge>
  )
}
