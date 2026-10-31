import { describe, expect, it } from 'vitest'
import { initials, progressOf } from './presentation.ts'

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
