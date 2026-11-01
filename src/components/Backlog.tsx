import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { useEffect, useEffectEvent, useMemo, useState, type RefObject } from 'react'
import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { locate, resolveMove, type BacklogMove, type DropPosition } from '../lib/backlog-move.ts'
import { descendantIds, visibleRows, type BacklogNode } from '../lib/backlog-tree.ts'
import { BacklogRow, type RowDropData } from './BacklogRow.tsx'
import { DragChip, type DraggedItem } from './DragChip.tsx'

interface BacklogProps {
  tree: BacklogNode[]
  types: string[]
  scrollContainer: RefObject<HTMLElement | null>
  onMove: (move: BacklogMove) => void
}

export function Backlog({ tree, types, scrollContainer, onMove }: BacklogProps) {
  const [expanded, setExpanded] = useState(new Set<number>())
  const [dragged, setDragged] = useState<DraggedItem>()
  const rows = useMemo(() => visibleRows(tree, expanded), [tree, expanded])
  const dimmedIds = useMemo(() => new Set(dragged ? [dragged.node.id, ...descendantIds(dragged.node)] : []), [dragged])

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

  const startDrag = useEffectEvent((id: number, input: Input) => {
    const found = locate(tree, id)
    if (found) setDragged({ node: found.node, input })
  })

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
        onDragStart: ({ source, location }) => startDrag(source.data.id as number, location.current.input),
        onDrop: ({ source, location }) => {
          setDragged(undefined)
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
    <>
      <ul role="tree" aria-label="Backlog" className="py-1">
        {rows.map(({ node, depth }) => (
          <BacklogRow
            key={node.id}
            node={node}
            depth={depth}
            types={types}
            isExpanded={expanded.has(node.id)}
            isDimmed={dimmedIds.has(node.id)}
            onToggle={toggle}
            onExpand={expand}
          />
        ))}
      </ul>
      <DragChip dragged={dragged} />
    </>
  )
}
