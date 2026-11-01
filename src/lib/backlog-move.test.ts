import { describe, expect, it } from 'vitest'
import { applyMove, dropKind, resolveMove, type DragRow } from './backlog-move.ts'
import { buildTree, type BacklogItem, type BacklogLink } from './backlog-tree.ts'

const types = ['Epic', 'Feature', 'Product Backlog Item']

const row = (id: number, type: string, depth: number, parent?: number): DragRow => ({ id, type, depth, parent })

describe('dropKind', () => {
  it('reorders rows of the same level under a parent', () => {
    expect(dropKind(row(1, 'Feature', 1, 9), row(2, 'Feature', 1, 8), types)).toBe('edge')
  })

  it('reorders Epics at the top level', () => {
    expect(dropKind(row(1, 'Epic', 0), row(2, 'Epic', 0), types)).toBe('edge')
  })

  it('does not reorder orphans at the top level', () => {
    expect(dropKind(row(1, 'Feature', 0), row(2, 'Feature', 0), types)).toBeUndefined()
    expect(dropKind(row(1, 'Feature', 1, 9), row(2, 'Feature', 0), types)).toBeUndefined()
  })

  it('moves an item into a row one level up', () => {
    expect(dropKind(row(1, 'Feature', 1, 9), row(8, 'Epic', 0), types)).toBe('inside')
    expect(dropKind(row(1, 'Product Backlog Item', 2, 9), row(8, 'Feature', 1, 7), types)).toBe('inside')
  })

  it('moves an orphan into a parent', () => {
    expect(dropKind(row(1, 'Product Backlog Item', 0), row(8, 'Feature', 1, 7), types)).toBe('inside')
    expect(dropKind(row(1, 'Feature', 0, 5), row(8, 'Epic', 0), types)).toBe('inside')
  })

  it('does not accept the current parent', () => {
    expect(dropKind(row(1, 'Feature', 1, 8), row(8, 'Epic', 0), types)).toBeUndefined()
  })

  it('does not put a backlog item directly under an Epic', () => {
    expect(dropKind(row(1, 'Product Backlog Item', 2, 9), row(8, 'Epic', 0), types)).toBeUndefined()
  })

  it('does not accept a lower level, which also rules out an item inside itself', () => {
    expect(dropKind(row(1, 'Epic', 0), row(2, 'Feature', 1, 1), types)).toBeUndefined()
    expect(dropKind(row(1, 'Feature', 1, 9), row(2, 'Product Backlog Item', 2, 1), types)).toBeUndefined()
  })

  it('does not accept the item itself', () => {
    expect(dropKind(row(1, 'Feature', 1, 9), row(1, 'Feature', 1, 9), types)).toBeUndefined()
  })
})

// Epic 1 holds Features 11, 12 and 13. Feature 11 holds items 111, 112 and 113.
// Epic 2 is empty, and so is Feature 13. Feature 3 is an orphan under a closed parent.
function sampleTree() {
  const items: BacklogItem[] = [
    { id: 1, type: 'Epic', title: '', state: 'New', order: 1 },
    { id: 2, type: 'Epic', title: '', state: 'New', order: 2 },
    { id: 3, type: 'Feature', title: '', state: 'New', order: 3, parent: 99 },
    { id: 11, type: 'Feature', title: '', state: 'New', order: 11, parent: 1 },
    { id: 12, type: 'Feature', title: '', state: 'New', order: 12, parent: 1 },
    { id: 13, type: 'Feature', title: '', state: 'New', order: 13, parent: 1 },
    { id: 111, type: 'Product Backlog Item', title: '', state: 'New', order: 111, parent: 11 },
    { id: 112, type: 'Product Backlog Item', title: '', state: 'New', order: 112, parent: 11 },
    { id: 113, type: 'Product Backlog Item', title: '', state: 'New', order: 113, parent: 11 },
  ]
  const links: BacklogLink[] = items.flatMap(({ id, parent }) => (parent && parent !== 99 ? [{ parent, child: id }] : []))
  return buildTree(items, links, types)
}

const children = (tree: ReturnType<typeof sampleTree>, id: number) =>
  tree.flatMap(function find(node): number[] {
    return node.id === id ? node.children.map((child) => child.id) : node.children.flatMap(find)
  })

describe('resolveMove', () => {
  const tree = sampleTree()

  it('moves to the top of the same parent', () => {
    expect(resolveMove(tree, 113, 111, 'above')).toEqual({ id: 113, fromParent: 11, toParent: 11, previousId: 0, nextId: 111 })
  })

  it('moves to the middle of the same parent', () => {
    expect(resolveMove(tree, 113, 112, 'above')).toEqual({ id: 113, fromParent: 11, toParent: 11, previousId: 111, nextId: 112 })
    expect(resolveMove(tree, 111, 112, 'below')).toEqual({ id: 111, fromParent: 11, toParent: 11, previousId: 112, nextId: 113 })
  })

  it('moves to the bottom of the same parent', () => {
    expect(resolveMove(tree, 111, 113, 'below')).toEqual({ id: 111, fromParent: 11, toParent: 11, previousId: 113, nextId: 0 })
  })

  it('leaves out the moved item when finding neighbours', () => {
    expect(resolveMove(tree, 112, 113, 'below')).toEqual({ id: 112, fromParent: 11, toParent: 11, previousId: 113, nextId: 0 })
  })

  it('moves to the bottom of a new parent', () => {
    expect(resolveMove(tree, 12, 2, 'inside')).toEqual({ id: 12, fromParent: 1, toParent: 2, previousId: 0, nextId: 0 })
    expect(resolveMove(tree, 3, 1, 'inside')).toEqual({ id: 3, fromParent: 99, toParent: 1, previousId: 13, nextId: 0 })
  })

  it('moves between the children of a new parent', () => {
    expect(resolveMove(sampleTreeWithItemIn12(), 121, 112, 'above')).toEqual({ id: 121, fromParent: 12, toParent: 11, previousId: 111, nextId: 112 })
  })

  it('reorders Epics without counting the orphans beside them', () => {
    expect(resolveMove(tree, 1, 2, 'below')).toEqual({ id: 1, toParent: undefined, fromParent: undefined, previousId: 2, nextId: 0 })
  })

  it('returns nothing when the item would stay where it is', () => {
    expect(resolveMove(tree, 112, 111, 'below')).toBeUndefined()
    expect(resolveMove(tree, 112, 113, 'above')).toBeUndefined()
    expect(resolveMove(tree, 1, 2, 'above')).toBeUndefined()
  })
})

function sampleTreeWithItemIn12() {
  return applyMove(sampleTree(), { id: 113, fromParent: 11, toParent: 12, previousId: 0, nextId: 0 }).map(function rename(node): typeof node {
    return { ...node, id: node.id === 113 ? 121 : node.id, children: node.children.map(rename) }
  })
}

describe('applyMove', () => {
  const tree = sampleTree()

  it('reorders within a parent', () => {
    const moved = applyMove(tree, { id: 113, fromParent: 11, toParent: 11, previousId: 0, nextId: 111 })

    expect(children(moved, 11)).toEqual([113, 111, 112])
  })

  it('moves to the bottom of a new parent and records the parent', () => {
    const moved = applyMove(tree, { id: 112, fromParent: 11, toParent: 12, previousId: 0, nextId: 0 })

    expect(children(moved, 11)).toEqual([111, 113])
    expect(children(moved, 12)).toEqual([112])
    expect(resolveMove(moved, 112, 13, 'inside')?.fromParent).toBe(12)
  })

  it('takes an orphan off the top level', () => {
    const moved = applyMove(tree, { id: 3, fromParent: 99, toParent: 1, previousId: 13, nextId: 0 })

    expect(moved.map((node) => node.id)).toEqual([1, 2])
    expect(children(moved, 1)).toEqual([11, 12, 13, 3])
  })

  it('reorders Epics at the top level, above the orphans', () => {
    const moved = applyMove(tree, { id: 1, previousId: 2, nextId: 0 })

    expect(moved.map((node) => node.id)).toEqual([2, 1, 3])
  })

  it('leaves the original tree untouched', () => {
    applyMove(tree, { id: 112, fromParent: 11, toParent: 12, previousId: 0, nextId: 0 })

    expect(children(tree, 11)).toEqual([111, 112, 113])
  })
})
