import { retryOnReset, type AzureDevOpsClient, type BacklogConfiguration, type PatchOperation, type TeamFieldValue, type WorkItem } from './azure-devops.ts'
import type { BacklogMove } from './backlog-move.ts'
import { buildTree, type BacklogItem, type BacklogLink } from './backlog-tree.ts'

const closedStates = ['Done', 'Closed', 'Removed']
const parentChildLink = 'System.LinkTypes.Hierarchy-Forward'
const childParentLink = 'System.LinkTypes.Hierarchy-Reverse'
const batchSize = 200

export class MoveConflictError extends Error {
  constructor() {
    super('This item was moved in Azure DevOps in the meantime')
  }
}

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const quoteList = (values: string[]) => values.map(quote).join(', ')

// From the top level down: Epic, Feature, Product Backlog Item.
export function backlogTypes(configuration: BacklogConfiguration) {
  return [...configuration.portfolioBacklogs, configuration.requirementBacklog]
    .sort((a, b) => b.rank - a.rank)
    .flatMap((level) => level.workItemTypes.map((type) => type.name))
}

export function backlogQuery(types: string[], areas: TeamFieldValue[]) {
  const condition = (side: 'Source' | 'Target') => {
    const inTeam = areas
      .map(({ value, includeChildren }) => `[${side}].[System.AreaPath] ${includeChildren ? 'UNDER' : '='} ${quote(value)}`)
      .join(' OR ')
    return `[${side}].[System.WorkItemType] IN (${quoteList(types)}) AND [${side}].[System.State] NOT IN (${quoteList(closedStates)}) AND (${inTeam})`
  }

  return `SELECT [System.Id] FROM WorkItemLinks WHERE (${condition('Source')}) AND ([System.Links.LinkType] = '${parentChildLink}') AND (${condition('Target')}) MODE (MayContain)`
}

function toItem(workItem: WorkItem, orderField: string): BacklogItem {
  const { fields } = workItem
  const assignedTo = fields['System.AssignedTo'] as { displayName: string } | undefined
  return {
    id: workItem.id,
    title: fields['System.Title'] as string,
    type: fields['System.WorkItemType'] as string,
    state: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName,
    order: fields[orderField] as number | undefined,
    parent: fields['System.Parent'] as number | undefined,
  }
}

export type Backlog = Awaited<ReturnType<typeof loadBacklog>>

export async function loadBacklog(client: AzureDevOpsClient) {
  const [configuration, team] = await Promise.all([client.backlogConfiguration(), client.teamFieldValues()])
  const types = backlogTypes(configuration)
  const orderField = configuration.backlogFields.typeFields.Order
  const effortField = configuration.backlogFields.typeFields.Effort

  const { workItemRelations } = await client.queryLinks(backlogQuery(types, team.values))

  const ids = [...new Set(workItemRelations.map(({ target }) => target.id))]
  const links: BacklogLink[] = workItemRelations.flatMap(({ source, target }) =>
    source ? [{ parent: source.id, child: target.id }] : [],
  )

  const fields = ['System.Title', 'System.WorkItemType', 'System.State', 'System.AssignedTo', 'System.Parent', orderField]
  const batches = []
  for (let start = 0; start < ids.length; start += batchSize) {
    batches.push(client.workItems(ids.slice(start, start + batchSize), fields))
  }
  const results = await Promise.all(batches)
  const items = results.flatMap(({ value }) => value.map((workItem) => toItem(workItem, orderField)))

  return { tree: buildTree(items, links, types), types, effortField }
}

// Link changes don't raise `rev`, so only reading the parent shows that someone
// else moved the item. A single PATCH swaps the links, because an item can have
// only one parent.
async function changeParent(client: MoveClient, id: number, fromParent: number | undefined, toParent: number) {
  const workItem = await retryOnReset(() => client.workItem(id))
  const relations = workItem.relations ?? []
  const parentIndex = relations.findIndex(({ rel }) => rel === childParentLink)
  const parent = relations[parentIndex]
  const currentParent = parent ? Number(parent.url.split('/').at(-1)) : undefined
  if (currentParent !== fromParent) throw new MoveConflictError()

  const operations: PatchOperation[] = [
    { op: 'test', path: '/rev', value: workItem.rev },
    ...(parent ? [{ op: 'remove' as const, path: `/relations/${parentIndex}` }] : []),
    { op: 'add', path: '/relations/-', value: { rel: childParentLink, url: client.workItemUrl(toParent) } },
  ]
  await client.updateWorkItem(id, operations)
}

export type MoveClient = Pick<AzureDevOpsClient, 'workItem' | 'workItemUrl' | 'updateWorkItem' | 'reorder'>

// The link comes first, as in Azure DevOps' own drag, so the order is set under the new parent.
export async function moveItem(client: MoveClient, { id, fromParent, toParent, previousId, nextId }: BacklogMove) {
  if (toParent !== undefined && toParent !== fromParent) await changeParent(client, id, fromParent, toParent)
  await client.reorder({ ids: [id], parentId: toParent ?? 0, previousId, nextId })
}
