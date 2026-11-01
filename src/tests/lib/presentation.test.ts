import { describe, expect, it } from 'vitest'
import { formatDate, formatSprintDates, initials, progressOf } from '../../lib/presentation.ts'

describe('initials', () => {
  it('reads Azure DevOps names in "Last, First" order', () => {
    expect(initials('Jansen, Anna')).toBe('AJ')
  })

  it('uses the surname when the given part has a suffix', () => {
    expect(initials('Berg, Piet van den')).toBe('PB')
  })

  it('handles names without a comma', () => {
    expect(initials('Anna Jansen')).toBe('AJ')
    expect(initials('Admin')).toBe('A')
  })
})

describe('progressOf', () => {
  it('treats unknown states as not started', () => {
    expect(progressOf('New')).toBe(0)
    expect(progressOf('Something custom')).toBe(0)
  })

  it('moves forward through the workflow', () => {
    expect(progressOf('Approved')).toBeLessThan(progressOf('Committed'))
    expect(progressOf('Committed')).toBeLessThan(progressOf('Done'))
  })
})

describe('formatDate', () => {
  const now = new Date('2026-11-01T12:00:00Z')

  it('leaves out the current year', () => {
    expect(formatDate('2026-10-12T12:00:00Z', now)).toBe('12 Oct')
  })

  it('shows any other year', () => {
    expect(formatDate('2025-10-12T12:00:00Z', now)).toBe('12 Oct 2025')
  })
})

describe('formatSprintDates', () => {
  it('reads midnight UTC as that same day, wherever the viewer is', () => {
    expect(formatSprintDates('2026-10-29T00:00:00Z', '2026-11-18T00:00:00Z')).toBe('29 Oct – 18 Nov')
  })
})
