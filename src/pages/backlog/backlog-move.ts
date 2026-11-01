import type { BacklogNode } from './backlog-tree.ts'

export interface DragRow {
  id: number
  type: string
  parent?: number
  depth: number
}

export type DropPosition = 'above' | 'below' | 'inside'

export interface BacklogMove {
  id: number
  fromParent?: number
  toParent?: number
  // Azure DevOps reads 0 as the start or end of the list.
  previousId: number
  nextId: number
}

// A same-level row takes a line above or below it, and a row one level up takes
// the item inside. This also rules out dropping an item inside itself.
// Orphans have no parent to order within, so only Epics reorder at the top level.
export function dropKind(source: DragRow, target: DragRow, types: string[]) {
  if (source.id === target.id) return undefined

  const level = types.indexOf(source.type)
  const targetLevel = types.indexOf(target.type)

  if (targetLevel === level) return level === 0 || target.depth > 0 ? 'edge' : undefined
  return targetLevel === level - 1 && target.id !== source.parent ? 'inside' : undefined
}

export function locate(nodes: BacklogNode[], id: number, parent?: BacklogNode): { node: BacklogNode; siblings: BacklogNode[]; parent?: BacklogNode } | undefined {
  for (const node of nodes) {
    if (node.id === id) return { node, siblings: nodes, parent }
    const found = locate(node.children, id, node)
    if (found) return found
  }
  return undefined
}

// Returns nothing when the drop would leave the item where it is.
export function resolveMove(tree: BacklogNode[], id: number, targetId: number, position: DropPosition) {
  const moved = locate(tree, id)
  const target = locate(tree, targetId)
  if (!moved || !target) return undefined

  const toParent = position === 'inside' ? target.node : target.parent
  const siblings = (position === 'inside' ? target.node.children : target.siblings).filter(({ type }) => type === moved.node.type)
  const others = siblings.filter((node) => node.id !== id)

  let insertAt = others.length
  if (position !== 'inside') {
    const targetIndex = others.findIndex((node) => node.id === targetId)
    insertAt = position === 'above' ? targetIndex : targetIndex + 1
  }

  const previous = others[insertAt - 1]
  const next = others[insertAt]

  const currentIndex = siblings.findIndex((node) => node.id === id)
  const unmoved = toParent?.id === moved.parent?.id && currentIndex === insertAt
  if (unmoved) return undefined

  const move: BacklogMove = {
    id,
    fromParent: moved.node.parent,
    toParent: toParent?.id,
    previousId: previous?.id ?? 0,
    nextId: next?.id ?? 0,
  }
  return move
}

function without(nodes: BacklogNode[], id: number): BacklogNode[] {
  return nodes.filter((node) => node.id !== id).map((node) => ({ ...node, children: without(node.children, id) }))
}

function placed(nodes: BacklogNode[], node: BacklogNode, { previousId, nextId }: BacklogMove) {
  const previousIndex = nodes.findIndex(({ id }) => id === previousId)
  const nextIndex = nodes.findIndex(({ id }) => id === nextId)
  const insertAt = previousIndex >= 0 ? previousIndex + 1 : nextIndex >= 0 ? nextIndex : nodes.length
  return [...nodes.slice(0, insertAt), node, ...nodes.slice(insertAt)]
}

// The tree as it should look once the move has been saved.
export function applyMove(tree: BacklogNode[], move: BacklogMove) {
  const moved = locate(tree, move.id)
  if (!moved) return tree

  const node = { ...moved.node, parent: move.toParent }
  const remaining = without(tree, move.id)
  if (move.toParent === undefined) return placed(remaining, node, move)

  function insert(nodes: BacklogNode[]): BacklogNode[] {
    return nodes.map((parent) => ({
      ...parent,
      children: parent.id === move.toParent ? placed(parent.children, node, move) : insert(parent.children),
    }))
  }
  return insert(remaining)
}
