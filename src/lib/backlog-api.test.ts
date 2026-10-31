import { describe, expect, it } from 'vitest'
import { backlogQuery, backlogTypes } from './backlog-api.ts'
import type { BacklogConfiguration } from './azure-devops.ts'

describe('backlogTypes', () => {
  it('lists types from the highest rank down', () => {
    const configuration: BacklogConfiguration = {
      portfolioBacklogs: [
        { name: 'Features', rank: 3, workItemTypes: [{ name: 'Feature' }] },
        { name: 'Epics', rank: 4, workItemTypes: [{ name: 'Epic' }] },
      ],
      requirementBacklog: { name: 'Backlog items', rank: 2, workItemTypes: [{ name: 'Product Backlog Item' }] },
      backlogFields: { typeFields: { Order: 'Microsoft.VSTS.Common.BacklogPriority' } },
    }

    expect(backlogTypes(configuration)).toEqual(['Epic', 'Feature', 'Product Backlog Item'])
  })
})

describe('backlogQuery', () => {
  it('escapes quotes in area paths', () => {
    const query = backlogQuery(['Epic'], [{ value: "O'Brien", includeChildren: true }])

    expect(query).toContain("[Source].[System.AreaPath] UNDER 'O''Brien'")
  })

  it('matches an area exactly when children are excluded', () => {
    const query = backlogQuery(['Epic'], [{ value: 'Team', includeChildren: false }])

    expect(query).toContain("[Target].[System.AreaPath] = 'Team'")
  })
})
