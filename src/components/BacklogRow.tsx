import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview'
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { ChevronRight } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { dropKind, type DragRow, type DropPosition } from '../lib/backlog-move.ts'
import type { BacklogNode } from '../lib/backlog-tree.ts'
import { initials } from '../lib/presentation.ts'
import { StatusIcon, TypeIcon } from './BacklogIcons.tsx'

const indentPerLevel = 1.25
const sidePadding = 0.75
const openDelay = 600

export interface RowDropData {
  id: number
  position: DropPosition
}

interface BacklogRowProps {
  node: BacklogNode
  depth: number
  types: string[]
  isExpanded: boolean
  isDimmed: boolean
  onToggle: (id: number) => void
  onExpand: (id: number) => void
}

export function BacklogRow({ node, depth, types, isExpanded, isDimmed, onToggle, onExpand }: BacklogRowProps) {
  const element = useRef<HTMLLIElement>(null)
  const [position, setPosition] = useState<DropPosition>()

  const { id, type, parent, title, state, assignedTo } = node
  const hasChildren = node.children.length > 0
  const inset = `${sidePadding + depth * indentPerLevel}rem`
  const expandOnHover = useEffectEvent(() => onExpand(id))

  useEffect(() => {
    if (!element.current) return undefined
    const row: DragRow = { id, type, parent, depth }
    let openTimer: ReturnType<typeof setTimeout> | undefined

    return combine(
      draggable({
        element: element.current,
        getInitialData: () => ({ ...row }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => disableNativeDragPreview({ nativeSetDragImage }),
      }),
      dropTargetForElements({
        element: element.current,
        canDrop: ({ source }) => dropKind(source.data as unknown as DragRow, row, types) !== undefined,
        getData: ({ source, input, element }) => {
          if (dropKind(source.data as unknown as DragRow, row, types) === 'inside') return { id, position: 'inside' }
          // "Below" an open row would land between it and its own children.
          const allowedEdges = isExpanded && hasChildren ? (['top'] as const) : (['top', 'bottom'] as const)
          const edge = extractClosestEdge(attachClosestEdge({}, { element, input, allowedEdges: [...allowedEdges] }))
          return { id, position: edge === 'top' ? 'above' : 'below' }
        },
        onDragEnter: ({ self }) => {
          if (self.data.position === 'inside' && hasChildren && !isExpanded) {
            openTimer = setTimeout(expandOnHover, openDelay)
          }
        },
        onDrag: ({ self }) => setPosition((self.data as unknown as RowDropData).position),
        onDragLeave: () => {
          clearTimeout(openTimer)
          setPosition(undefined)
        },
        onDrop: () => {
          clearTimeout(openTimer)
          setPosition(undefined)
        },
      }),
      () => clearTimeout(openTimer),
    )
  }, [id, type, parent, depth, types, isExpanded, hasChildren])

  return (
    <li
      ref={element}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={hasChildren ? isExpanded : undefined}
      className={cn(
        'relative flex h-8.5 cursor-default items-center gap-2 hover:bg-accent',
        isDimmed && 'opacity-50',
        position === 'inside' && 'bg-accent ring-1 ring-primary ring-inset',
      )}
      style={{ paddingLeft: inset, paddingRight: `${sidePadding}rem` }}
    >
      {(position === 'above' || position === 'below') && (
        <span
          aria-hidden
          className={cn('absolute h-0.5 rounded-full bg-primary', position === 'above' ? '-top-px' : '-bottom-px')}
          style={{ left: inset, right: `${sidePadding}rem` }}
        />
      )}
      {hasChildren ? (
        <button
          type="button"
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
          className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => onToggle(id)}
        >
          <ChevronRight className={cn('size-4.5', isExpanded && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-7 shrink-0" />
      )}
      <TypeIcon type={type} />
      <span className={cn('min-w-0 flex-1 truncate', depth === 0 && 'font-medium')}>{title}</span>
      <Tooltip>
        <TooltipTrigger render={<span className="flex size-5 shrink-0 items-center justify-center" />}>
          <StatusIcon state={state} />
        </TooltipTrigger>
        <TooltipContent>{state}</TooltipContent>
      </Tooltip>
      {assignedTo ? (
        <Tooltip>
          <TooltipTrigger render={<span className="shrink-0" />}>
            <Avatar size="sm" className="data-[size=sm]:size-5">
              <AvatarFallback className="text-[0.5625rem] font-medium">{initials(assignedTo)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{assignedTo}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="size-5 shrink-0" />
      )}
    </li>
  )
}
