import type React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface UserStatsCardProps {
  title: string
  subtitle?: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  headerAction?: React.ReactNode
  isLoading?: boolean
}

export function UserStatsCard({
  title,
  subtitle,
  value,
  icon: Icon,
  headerAction,
  isLoading,
}: UserStatsCardProps) {
  return (
    <Card className="overflow-hidden relative border border-border transition-all duration-200 hover:shadow-sm bg-card/60 backdrop-blur-sm hover:border-zinc-400/60 dark:hover:border-zinc-600/60">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-600/30 dark:bg-zinc-400/30" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase truncate">
              {title}
            </CardTitle>
            {headerAction}
          </div>
          {subtitle && (
            <span className="text-[11px] text-muted-foreground/75 font-normal truncate">
              {subtitle}
            </span>
          )}
        </div>
        <div className="shrink-0 p-1.5 rounded-lg bg-secondary/70 border border-border/50 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <div className="py-1">
            <Skeleton className="h-8 w-20" />
          </div>
        ) : (
          <div className="text-2xl font-extrabold tracking-tight text-foreground">
            {value.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
