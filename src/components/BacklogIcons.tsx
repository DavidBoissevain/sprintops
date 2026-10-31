import { Circle, Crown, SquareMenu, Trophy, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { progressOf } from '../lib/presentation.ts'

// The same symbols Azure DevOps uses, in a lighter two-tone style.
const typeIcons: Record<string, { icon: LucideIcon; color: string }> = {
  Epic: { icon: Crown, color: 'text-level-epic' },
  Feature: { icon: Trophy, color: 'text-level-feature' },
  'Product Backlog Item': { icon: SquareMenu, color: 'text-level-item' },
}

const fallbackIcon = { icon: Circle, color: 'text-muted-foreground' }

export function TypeIcon({ type }: { type: string }) {
  const { icon: Icon, color } = typeIcons[type] ?? fallbackIcon

  return <Icon className={cn('size-4 shrink-0', color)} fill="currentColor" fillOpacity={0.2} role="img" aria-label={type} />
}

const pieRadius = 2.5
const pieCircumference = 2 * Math.PI * pieRadius

// A circle that fills up as work progresses, drawn as a thick dashed stroke.
export function StatusIcon({ state }: { state: string }) {
  const progress = progressOf(state)
  const color = progress === 0 ? 'text-muted-foreground' : progress < 0.5 ? 'text-primary' : 'text-status-active'

  return (
    <svg viewBox="0 0 14 14" className={cn('size-3.5 shrink-0 fill-none stroke-current', color)} role="img" aria-label={state}>
      <circle cx="7" cy="7" r="5.75" strokeWidth="1.5" strokeDasharray={progress === 0 ? '2.2 2.3' : undefined} />
      {progress > 0 && (
        <circle
          cx="7"
          cy="7"
          r={pieRadius}
          strokeWidth={pieRadius * 2}
          strokeDasharray={`${progress * pieCircumference} ${pieCircumference}`}
          transform="rotate(-90 7 7)"
        />
      )}
    </svg>
  )
}
