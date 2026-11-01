import { useRef, type PointerEvent } from 'react'
import { SidebarRail, useSidebar } from '@/components/ui/sidebar'
import { clampDragWidth, settleWidth, sidebarWidths, willCollapse } from '../../lib/sidebar-width.ts'

const dragThreshold = 3

interface Drag {
  wrapper: HTMLElement
  startX: number
  offset: number
  moved: boolean
}

interface SidebarResizeRailProps {
  width: number
  onWidthChange: (width: number) => void
}

export function SidebarResizeRail({ width, onWidthChange }: SidebarResizeRailProps) {
  const { open, setOpen, toggleSidebar, isMobile } = useSidebar()
  const drag = useRef<Drag | null>(null)
  const justDragged = useRef(false)

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    const wrapper = event.currentTarget.closest<HTMLElement>('[data-slot=sidebar-wrapper]')
    if (isMobile || event.button !== 0 || !wrapper) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    justDragged.current = false
    drag.current = {
      wrapper,
      startX: event.clientX,
      offset: (open ? width : sidebarWidths.rail) - event.clientX,
      moved: false,
    }
  }

  // Sets the width directly, because re-rendering the backlog on every pointer
  // move would make the drag lag.
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current) return

    if (!current.moved) {
      if (Math.abs(event.clientX - current.startX) < dragThreshold) return
      current.moved = true
      current.wrapper.toggleAttribute('data-sidebar-resizing', true)
      if (!open) setOpen(true)
    }

    const dragged = clampDragWidth(event.clientX + current.offset)
    current.wrapper.style.setProperty('--sidebar-width', `${dragged}px`)
    current.wrapper.toggleAttribute('data-sidebar-collapsing', willCollapse(dragged))
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return

    justDragged.current = true
    current.wrapper.removeAttribute('data-sidebar-resizing')
    current.wrapper.removeAttribute('data-sidebar-collapsing')

    const settled = settleWidth(clampDragWidth(event.clientX + current.offset))
    if (settled === null) {
      setOpen(false)
      current.wrapper.style.setProperty('--sidebar-width', `${width}px`)
    } else {
      current.wrapper.style.setProperty('--sidebar-width', `${settled}px`)
      onWidthChange(settled)
    }
  }

  function click() {
    if (!justDragged.current) toggleSidebar()
    justDragged.current = false
  }

  return (
    <SidebarRail
      title="Drag to resize, click to collapse"
      className="touch-none max-md:hidden in-data-[side=left]:cursor-col-resize [[data-side=left][data-state=collapsed]_&]:cursor-col-resize"
      onClick={click}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  )
}
