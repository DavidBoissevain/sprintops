import { describe, expect, it, vi } from 'vitest'
import { backlogQuery, backlogTypes, moveItem, MoveConflictError, type MoveClient } from './backlog-api.ts'
import type { BacklogConfiguration, WorkItem } from './azure-devops.ts'

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

describe('moveItem', () => {
  const parentRelation = (id: number) => ({ rel: 'System.LinkTypes.Hierarchy-Reverse', url: `https://example.test/workItems/${id}` })
  const childRelation = { rel: 'System.LinkTypes.Hierarchy-Forward', url: 'https://example.test/workItems/7' }

  function fakeClient(relations?: WorkItem['relations']) {
    const calls: string[] = []
    const client = {
      workItem: vi.fn(async (id: number) => {
        calls.push('read')
        return { id, rev: 4, fields: {}, relations }
      }),
      workItemUrl: (id: number) => `https://example.test/workItems/${id}`,
      updateWorkItem: vi.fn(async (id: number) => {
        calls.push('link')
        return { id, rev: 4, fields: {} }
      }),
      reorder: vi.fn(async () => {
        calls.push('order')
        return { value: [] }
      }),
    } satisfies MoveClient
    return { client, calls }
  }

  it('makes one call when the parent stays the same', async () => {
    const { client, calls } = fakeClient()

    await moveItem(client, { id: 1, fromParent: 5, toParent: 5, previousId: 2, nextId: 3 })

    expect(calls).toEqual(['order'])
    expect(client.reorder).toHaveBeenCalledWith({ ids: [1], parentId: 5, previousId: 2, nextId: 3 })
  })

  it('reorders Epics with parent 0', async () => {
    const { client } = fakeClient()

    await moveItem(client, { id: 1, previousId: 2, nextId: 0 })

    expect(client.reorder).toHaveBeenCalledWith({ ids: [1], parentId: 0, previousId: 2, nextId: 0 })
  })

  it('swaps the parent link in one patch, then sets the order', async () => {
    const { client, calls } = fakeClient([childRelation, parentRelation(5)])

    await moveItem(client, { id: 1, fromParent: 5, toParent: 6, previousId: 2, nextId: 0 })

    expect(calls).toEqual(['read', 'link', 'order'])
    expect(client.updateWorkItem).toHaveBeenCalledWith(1, [
      { op: 'test', path: '/rev', value: 4 },
      { op: 'remove', path: '/relations/1' },
      { op: 'add', path: '/relations/-', value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: 'https://example.test/workItems/6' } },
    ])
    expect(client.reorder).toHaveBeenCalledWith({ ids: [1], parentId: 6, previousId: 2, nextId: 0 })
  })

  it('removes no link from an item without a parent', async () => {
    const { client } = fakeClient([childRelation])

    await moveItem(client, { id: 1, toParent: 6, previousId: 0, nextId: 0 })

    expect(client.updateWorkItem).toHaveBeenCalledWith(1, [
      { op: 'test', path: '/rev', value: 4 },
      { op: 'add', path: '/relations/-', value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: 'https://example.test/workItems/6' } },
    ])
  })

  it('replaces the link to a closed parent', async () => {
    const { client } = fakeClient([parentRelation(99)])

    await moveItem(client, { id: 1, fromParent: 99, toParent: 6, previousId: 0, nextId: 0 })

    expect(client.updateWorkItem).toHaveBeenCalledWith(1, expect.arrayContaining([{ op: 'remove', path: '/relations/0' }]))
  })

  it('writes nothing when someone else changed the parent', async () => {
    const { client, calls } = fakeClient([parentRelation(8)])

    await expect(moveItem(client, { id: 1, fromParent: 5, toParent: 6, previousId: 0, nextId: 0 })).rejects.toBeInstanceOf(MoveConflictError)

    expect(calls).toEqual(['read'])
  })

  it('repeats the read after a reset connection', async () => {
    const { client, calls } = fakeClient([parentRelation(5)])
    client.workItem.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await moveItem(client, { id: 1, fromParent: 5, toParent: 6, previousId: 0, nextId: 0 })

    expect(client.workItem).toHaveBeenCalledTimes(2)
    expect(calls).toEqual(['read', 'link', 'order'])
  })

  it('does not repeat a read that Azure DevOps refused', async () => {
    const { client } = fakeClient([parentRelation(5)])
    client.workItem.mockRejectedValueOnce(new Error('rejected'))

    await expect(moveItem(client, { id: 1, fromParent: 5, toParent: 6, previousId: 0, nextId: 0 })).rejects.toThrow('rejected')

    expect(client.workItem).toHaveBeenCalledTimes(1)
  })

  it('never repeats a write after a reset connection', async () => {
    const { client } = fakeClient([parentRelation(5)])
    client.updateWorkItem.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(moveItem(client, { id: 1, fromParent: 5, toParent: 6, previousId: 0, nextId: 0 })).rejects.toThrow(TypeError)

    expect(client.updateWorkItem).toHaveBeenCalledTimes(1)
    expect(client.reorder).not.toHaveBeenCalled()
  })

  it('does not set the order when the parent change fails', async () => {
    const { client } = fakeClient([parentRelation(5)])
    client.updateWorkItem.mockRejectedValueOnce(new Error('rejected'))

    await expect(moveItem(client, { id: 1, fromParent: 5, toParent: 6, previousId: 0, nextId: 0 })).rejects.toThrow('rejected')

    expect(client.reorder).not.toHaveBeenCalled()
  })
})
