import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { progressOf } from '../lib/presentation.ts'

const insideTile = 'translate(8 8) scale(.68) translate(-8 -8)'

// The crown, trophy and list from Azure DevOps, in its colours, on a soft tile.
const typeIcons: Record<string, { glyph: ReactNode; color: string }> = {
  Epic: {
    color: 'text-level-epic',
    glyph: (
      <path
        d="M2.2 5.4 5.2 8 8 3.6 10.8 8l3-2.6-1 6.1a.9.9 0 0 1-.9.8H4.1a.9.9 0 0 1-.9-.8Z"
        className="fill-current stroke-current"
        strokeWidth=".8"
        strokeLinejoin="round"
        transform={insideTile}
      />
    ),
  },
  Feature: {
    color: 'text-level-feature',
    glyph: (
      <g transform={insideTile} className="stroke-current" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.9 2.6h6.2v3.9a3.1 3.1 0 0 1-6.2 0Z" className="fill-current" strokeWidth=".8" />
        <path
          d="M4.9 3.7H3.1v.9a2.4 2.4 0 0 0 2.1 2.4M11.1 3.7h1.8v.9a2.4 2.4 0 0 1-2.1 2.4M8 9.6v2.6M5.3 13.2h5.4"
          fill="none"
          strokeWidth="1.5"
        />
      </g>
    ),
  },
  'Product Backlog Item': {
    color: 'text-level-item',
    glyph: (
      <path
        d="M4.6 5.2h6.8M4.6 8h6.8M4.6 10.8h6.8"
        fill="none"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
  },
}

const fallbackIcon = {
  color: 'text-muted-foreground',
  glyph: <circle cx="8" cy="8" r="2.5" className="fill-current" />,
}

export function TypeIcon({ type }: { type: string }) {
  const { glyph, color } = typeIcons[type] ?? fallbackIcon

  return (
    <svg viewBox="0 0 16 16" className={cn('size-4 shrink-0', color)} role="img" aria-label={type}>
      <rect width="16" height="16" rx="4.5" className="fill-current" fillOpacity=".18" />
      {glyph}
    </svg>
  )
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
