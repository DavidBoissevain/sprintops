export interface BacklogItem {
  id: number
  title: string
  type: string
  state: string
  assignedTo?: string
  order?: number
  // The real parent, which can be closed and so missing from the tree.
  parent?: number
}

export interface BacklogNode extends BacklogItem {
  children: BacklogNode[]
}

export interface BacklogLink {
  parent: number
  child: number
}

export interface BacklogRow {
  node: BacklogNode
  depth: number
}

// Top level first. Items without an order sort last, as they do in Azure DevOps.
function compare(a: BacklogNode, b: BacklogNode, typeDepth: Map<string, number>) {
  return (
    (typeDepth.get(a.type) ?? Infinity) - (typeDepth.get(b.type) ?? Infinity) ||
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    a.id - b.id
  )
}

// `types` lists work item types from the top level down. Items whose parent is
// not in `items`, such as a Feature under a closed Epic, end up at the root.
export function buildTree(items: BacklogItem[], links: BacklogLink[], types: string[]) {
  const typeDepth = new Map(types.map((type, depth) => [type, depth]))
  const nodes = new Map<number, BacklogNode>(items.map((item) => [item.id, { ...item, children: [] }]))
  const childIds = new Set<number>()

  for (const { parent, child } of links) {
    const parentNode = nodes.get(parent)
    const childNode = nodes.get(child)
    if (!parentNode || !childNode || childIds.has(child)) continue
    parentNode.children.push(childNode)
    childIds.add(child)
  }

  for (const node of nodes.values()) {
    node.children.sort((a, b) => compare(a, b, typeDepth))
  }

  return [...nodes.values()]
    .filter((node) => !childIds.has(node.id))
    .sort((a, b) => compare(a, b, typeDepth))
}

export function visibleRows(tree: BacklogNode[], expanded: Set<number>) {
  const rows: BacklogRow[] = []

  function visit(nodes: BacklogNode[], depth: number) {
    for (const node of nodes) {
      rows.push({ node, depth })
      if (expanded.has(node.id)) visit(node.children, depth + 1)
    }
  }

  visit(tree, 0)
  return rows
}
