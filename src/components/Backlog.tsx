import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { useEffect, useEffectEvent, useMemo, useState, type RefObject } from 'react'
import { resolveMove, type BacklogMove, type DropPosition } from '../lib/backlog-move.ts'
import { visibleRows, type BacklogNode } from '../lib/backlog-tree.ts'
import { BacklogRow, type RowDropData } from './BacklogRow.tsx'

interface BacklogProps {
  tree: BacklogNode[]
  types: string[]
  scrollContainer: RefObject<HTMLElement | null>
  onMove: (move: BacklogMove) => void
}

export function Backlog({ tree, types, scrollContainer, onMove }: BacklogProps) {
  const [expanded, setExpanded] = useState(new Set<number>())
  const rows = useMemo(() => visibleRows(tree, expanded), [tree, expanded])

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function expand(id: number) {
    setExpanded((current) => new Set(current).add(id))
  }

  const drop = useEffectEvent((id: number, targetId: number, position: DropPosition) => {
    const move = resolveMove(tree, id, targetId, position)
    if (!move) return
    if (position === 'inside') expand(targetId)
    onMove(move)
  })

  useEffect(() => {
    if (!scrollContainer.current) return undefined

    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          const target = location.current.dropTargets[0]
          if (!target) return
          const { id, position } = target.data as unknown as RowDropData
          drop(source.data.id as number, id, position)
        },
      }),
      autoScrollForElements({ element: scrollContainer.current }),
    )
  }, [scrollContainer])

  return (
    <ul role="tree" aria-label="Backlog" className="py-1">
      {rows.map(({ node, depth }) => (
        <BacklogRow
          key={node.id}
          node={node}
          depth={depth}
          types={types}
          isExpanded={expanded.has(node.id)}
          onToggle={toggle}
          onExpand={expand}
        />
      ))}
    </ul>
  )
}
