export const sidebarWidths = {
  default: 282,
  min: 220,
  max: 462,
  // Where the backlog card starts when the sidebar is collapsed to its icon rail:
  // 4.5rem at the root font size in index.css.
  rail: 79,
  collapseBelow: 165,
}

const storageKey = 'sprintops.sidebar-width'

export const clampDragWidth = (width: number) =>
  Math.min(sidebarWidths.max, Math.max(sidebarWidths.rail, width))

export const willCollapse = (width: number) => width < sidebarWidths.collapseBelow

// The width a released drag settles on, or null when the sidebar should collapse.
export function settleWidth(width: number) {
  if (willCollapse(width)) return null
  return Math.min(sidebarWidths.max, Math.max(sidebarWidths.min, width))
}

export function loadSidebarWidth() {
  try {
    const saved = Number(localStorage.getItem(storageKey))
    return saved ? (settleWidth(saved) ?? sidebarWidths.default) : sidebarWidths.default
  } catch {
    return sidebarWidths.default
  }
}

export function saveSidebarWidth(width: number) {
  try {
    localStorage.setItem(storageKey, String(width))
  } catch {
    // Storage is unavailable, so the width lasts until the page reloads.
  }
}
