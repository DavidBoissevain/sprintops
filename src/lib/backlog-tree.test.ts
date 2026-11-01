import { describe, expect, it } from 'vitest'
import { buildTree, descendantIds, visibleRows, type BacklogItem } from './backlog-tree.ts'

const types = ['Epic', 'Feature', 'Product Backlog Item']

const item = (id: number, type: string, order?: number): BacklogItem => ({
  id,
  type,
  order,
  title: `Item ${id}`,
  state: 'New',
})

describe('buildTree', () => {
  it('nests children under their parents', () => {
    const tree = buildTree(
      [item(1, 'Epic'), item(2, 'Feature'), item(3, 'Product Backlog Item')],
      [
        { parent: 1, child: 2 },
        { parent: 2, child: 3 },
      ],
      types,
    )

    expect(tree.map((node) => node.id)).toEqual([1])
    expect(tree[0]?.children[0]?.children[0]?.id).toBe(3)
  })

  it('sorts by order, with unordered items last by id', () => {
    const tree = buildTree(
      [item(1, 'Epic'), item(2, 'Epic', 20), item(3, 'Epic', 10), item(4, 'Epic')],
      [],
      types,
    )

    expect(tree.map((node) => node.id)).toEqual([3, 2, 1, 4])
  })

  it('keeps items at the root when their parent is not in the backlog', () => {
    const tree = buildTree([item(2, 'Feature')], [{ parent: 1, child: 2 }], types)

    expect(tree.map((node) => node.id)).toEqual([2])
  })

  it('puts higher levels first at the root', () => {
    const tree = buildTree([item(1, 'Feature', 1), item(2, 'Epic', 99)], [], types)

    expect(tree.map((node) => node.id)).toEqual([2, 1])
  })
})

describe('descendantIds', () => {
  it('lists children at every level', () => {
    const [epic] = buildTree(
      [item(1, 'Epic'), item(2, 'Feature'), item(3, 'Product Backlog Item'), item(4, 'Feature')],
      [
        { parent: 1, child: 2 },
        { parent: 2, child: 3 },
        { parent: 1, child: 4 },
      ],
      types,
    )

    expect(descendantIds(epic!)).toEqual([2, 3, 4])
  })

  it('is empty for an item without children', () => {
    const [epic] = buildTree([item(1, 'Epic')], [], types)

    expect(descendantIds(epic!)).toEqual([])
  })
})

describe('visibleRows', () => {
  const tree = buildTree(
    [item(1, 'Epic'), item(2, 'Feature'), item(3, 'Product Backlog Item')],
    [
      { parent: 1, child: 2 },
      { parent: 2, child: 3 },
    ],
    types,
  )

  it('shows only the top level when nothing is expanded', () => {
    const rows = visibleRows(tree, new Set())

    expect(rows.map(({ node }) => node.id)).toEqual([1])
  })

  it('returns expanded rows with their depth', () => {
    const rows = visibleRows(tree, new Set([1, 2]))

    expect(rows.map(({ node, depth }) => [node.id, depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
    ])
  })

  it('keeps children hidden until their own parent is expanded', () => {
    const rows = visibleRows(tree, new Set([2]))

    expect(rows.map(({ node }) => node.id)).toEqual([1])
  })
})
