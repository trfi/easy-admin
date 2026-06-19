import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// Derive up-to-two-letter initials from a name/username/email, in that order.
function initialsFor(name?: string | null, username?: string | null, email?: string): string {
  const source = name?.trim() || username?.trim() || email?.trim() || '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

// Shared avatar used in the users list and detail. Falls back to initials when
// there's no image URL (or it fails to load — AvatarImage handles that).
export function UserAvatar({
  name,
  username,
  email,
  src,
  className,
}: {
  name?: string | null
  username?: string | null
  email?: string
  src?: string | null
  className?: string
}) {
  return (
    <Avatar className={cn('h-9 w-9', className)}>
      {src ? <AvatarImage src={src} alt={name ?? username ?? email ?? 'User'} /> : null}
      <AvatarFallback className="text-xs font-medium">
        {initialsFor(name, username, email)}
      </AvatarFallback>
    </Avatar>
  )
}
