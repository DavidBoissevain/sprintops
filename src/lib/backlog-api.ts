import type { AzureDevOpsClient, BacklogConfiguration, TeamFieldValue, WorkItem } from './azure-devops.ts'
import { buildTree, type BacklogItem, type BacklogLink } from './backlog-tree.ts'

const closedStates = ['Done', 'Closed', 'Removed']
const parentChildLink = 'System.LinkTypes.Hierarchy-Forward'
const batchSize = 200

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
  }
}

export async function loadBacklog(client: AzureDevOpsClient) {
  const [configuration, team] = await Promise.all([client.backlogConfiguration(), client.teamFieldValues()])
  const types = backlogTypes(configuration)
  const orderField = configuration.backlogFields.typeFields.Order

  const { workItemRelations } = await client.queryLinks(backlogQuery(types, team.values))

  const ids = [...new Set(workItemRelations.map(({ target }) => target.id))]
  const links: BacklogLink[] = workItemRelations.flatMap(({ source, target }) =>
    source ? [{ parent: source.id, child: target.id }] : [],
  )

  const fields = ['System.Title', 'System.WorkItemType', 'System.State', 'System.AssignedTo', orderField]
  const batches = []
  for (let start = 0; start < ids.length; start += batchSize) {
    batches.push(client.workItems(ids.slice(start, start + batchSize), fields))
  }
  const results = await Promise.all(batches)
  const items = results.flatMap(({ value }) => value.map((workItem) => toItem(workItem, orderField)))

  return buildTree(items, links, types)
}
