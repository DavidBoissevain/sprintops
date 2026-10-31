import { describe, expect, it } from 'vitest'
import { clampDragWidth, settleWidth, sidebarWidths, willCollapse } from './sidebar-width.ts'

describe('clampDragWidth', () => {
  it('follows the pointer between the rail and the maximum', () => {
    expect(clampDragWidth(300)).toBe(300)
    expect(clampDragWidth(0)).toBe(sidebarWidths.rail)
    expect(clampDragWidth(2000)).toBe(sidebarWidths.max)
  })
})

describe('settleWidth', () => {
  it('keeps a width inside the allowed range', () => {
    expect(settleWidth(320)).toBe(320)
  })

  it('springs back to the minimum just above the collapse point', () => {
    expect(settleWidth(sidebarWidths.collapseBelow)).toBe(sidebarWidths.min)
  })

  it('collapses below the collapse point', () => {
    expect(settleWidth(sidebarWidths.collapseBelow - 1)).toBeNull()
    expect(willCollapse(sidebarWidths.collapseBelow - 1)).toBe(true)
  })

  it('never settles above the maximum', () => {
    expect(settleWidth(2000)).toBe(sidebarWidths.max)
  })
})
