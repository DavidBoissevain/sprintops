import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { visibleRows, type BacklogNode } from '../lib/backlog-tree.ts'
import { initials } from '../lib/presentation.ts'
import { StatusIcon, TypeIcon } from './BacklogIcons.tsx'

const indentPerLevel = 20
const sidePadding = 12

export function Backlog({ tree }: { tree: BacklogNode[] }) {
  const [expanded, setExpanded] = useState(new Set<number>())
  const rows = useMemo(() => visibleRows(tree, expanded), [tree, expanded])

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <ul role="tree" aria-label="Backlog" className="py-1">
      {rows.map(({ node, depth }) => {
        const hasChildren = node.children.length > 0
        const isExpanded = expanded.has(node.id)

        return (
          <li
            key={node.id}
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={hasChildren ? isExpanded : undefined}
            className="flex h-[34px] items-center gap-2 hover:bg-accent"
            style={{ paddingLeft: sidePadding + depth * indentPerLevel, paddingRight: sidePadding }}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.title}`}
                className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => toggle(node.id)}
              >
                <ChevronRight className={cn('size-3.5', isExpanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}
            <TypeIcon type={node.type} />
            <span className={cn('min-w-0 flex-1 truncate', depth === 0 && 'font-medium')}>{node.title}</span>
            <Tooltip>
              <TooltipTrigger render={<span className="flex size-5 shrink-0 items-center justify-center" />}>
                <StatusIcon state={node.state} />
              </TooltipTrigger>
              <TooltipContent>{node.state}</TooltipContent>
            </Tooltip>
            {node.assignedTo ? (
              <Tooltip>
                <TooltipTrigger render={<span className="shrink-0" />}>
                  <Avatar size="sm" className="data-[size=sm]:size-5">
                    <AvatarFallback className="text-[9px] font-medium">{initials(node.assignedTo)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{node.assignedTo}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="size-5 shrink-0" />
            )}
          </li>
        )
      })}
    </ul>
  )
}
