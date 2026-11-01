import { describe, expect, it } from 'vitest'
import { iterationLabel, toItemDetails } from '../../../pages/backlog/item-details.ts'

const effortField = 'Microsoft.VSTS.Scheduling.Effort'

describe('toItemDetails', () => {
  it('reads the fields the dialog shows', () => {
    const details = toItemDetails(
      {
        id: 1,
        rev: 1,
        fields: {
          'System.Title': 'Title',
          'System.WorkItemType': 'Feature',
          'System.State': 'New',
          'System.AssignedTo': { displayName: 'Jansen, Anna' },
          'System.Description': '<p>Text</p>',
          'System.IterationPath': 'Project\\Sprint 1',
          [effortField]: 0,
        },
      },
      effortField,
    )

    expect(details).toEqual({
      title: 'Title',
      type: 'Feature',
      state: 'New',
      assignedTo: 'Jansen, Anna',
      description: '<p>Text</p>',
      effort: 0,
      iterationPath: 'Project\\Sprint 1',
    })
  })

  it('leaves out what the item does not have', () => {
    const details = toItemDetails({ id: 1, rev: 1, fields: { 'System.IterationPath': 'Project' } }, effortField)

    expect(details.assignedTo).toBeUndefined()
    expect(details.description).toBeUndefined()
    expect(details.effort).toBeUndefined()
  })
})

describe('iterationLabel', () => {
  const iterations = [
    { path: 'Project\\Sprint 1', attributes: { startDate: '2026-10-29T00:00:00Z', finishDate: '2026-11-18T00:00:00Z' } },
    { path: 'Project\\Sprint 2', attributes: {} },
  ]

  it('treats the root path as no sprint', () => {
    expect(iterationLabel('Project', iterations)).toBeUndefined()
  })

  it('gives the sprint name and dates', () => {
    expect(iterationLabel('Project\\Sprint 1', iterations)).toEqual({ name: 'Sprint 1', dates: '29 Oct – 18 Nov' })
  })

  it('leaves out dates for a sprint without them', () => {
    expect(iterationLabel('Project\\Sprint 2', iterations)).toEqual({ name: 'Sprint 2', dates: undefined })
  })

  it('shows a sprint outside the team list by its last segment', () => {
    expect(iterationLabel('Project\\Release\\Other', iterations)).toEqual({ name: 'Other', dates: undefined })
  })

  it('works before the iterations have loaded', () => {
    expect(iterationLabel('Project\\Sprint 1')).toEqual({ name: 'Sprint 1', dates: undefined })
  })
})
