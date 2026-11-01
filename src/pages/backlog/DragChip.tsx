import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { descendantIds, type BacklogNode } from './backlog-tree.ts'
import { TypeIcon } from './BacklogIcons.tsx'

const pointerGap = { x: 8, y: 14 }

const transformAt = ({ clientX, clientY }: Input) => `translate(${clientX + pointerGap.x}px, ${clientY + pointerGap.y}px)`

export interface DraggedItem {
  node: BacklogNode
  input: Input
}

// Drawn by us instead of the browser, whose drag image is faint and can't be styled.
export function DragChip({ dragged }: { dragged?: DraggedItem }) {
  const element = useRef<HTMLDivElement>(null)

  // Written straight to the element, so moving the pointer doesn't re-render the backlog.
  useEffect(
    () =>
      monitorForElements({
        onDrag: ({ location }) => {
          if (element.current) element.current.style.transform = transformAt(location.current.input)
        },
      }),
    [],
  )

  if (!dragged) return null

  const { node, input } = dragged
  const childCount = descendantIds(node).length

  return createPortal(
    <div
      ref={element}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-50 flex max-w-72 items-center gap-2 rounded-lg border bg-popover px-2.5 py-1.5 font-medium text-popover-foreground shadow-lg"
      style={{ transform: transformAt(input) }}
    >
      <TypeIcon type={node.type} />
      <span className="min-w-0 truncate">{node.title}</span>
      {childCount > 0 && (
        <span className="shrink-0 rounded bg-muted px-1.5 text-[0.6875rem] font-semibold text-muted-foreground tabular-nums">
          +{childCount}
        </span>
      )}
    </div>,
    document.body,
  )
}
