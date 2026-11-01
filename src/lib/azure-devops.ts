import type { Connection } from '../config.ts'
import type { TokenProvider } from './token-provider.ts'

const apiVersion = 'api-version=7.1'
const commentsApiVersion = 'api-version=7.1-preview.4'
const readAttempts = 3
const readRetryDelay = 500

export class AzureDevOpsError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// A reset connection reaches us as a TypeError from fetch. Nothing has been
// written at this point, so unlike a write, a read can be repeated.
export async function retryOnReset<T>(read: () => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read()
    } catch (error) {
      if (!(error instanceof TypeError) || attempt === readAttempts) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * readRetryDelay))
    }
  }
}

// Work item HTML is untrusted, so an image URL must pass this before it gets the
// PAT. The organization can differ in case: real URLs use the display spelling.
export function isAttachmentUrl(url: string, organization: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const [firstSegment] = parsed.pathname.split('/').filter(Boolean)
  return (
    parsed.origin === 'https://dev.azure.com' &&
    !parsed.username &&
    !parsed.password &&
    firstSegment?.toLowerCase() === organization.toLowerCase() &&
    parsed.pathname.includes('/_apis/wit/attachments/')
  )
}

export function createClient(tokens: TokenProvider, connection: Connection) {
  const organization = `https://dev.azure.com/${encodeURIComponent(connection.organization)}`
  const project = `${organization}/${encodeURIComponent(connection.project)}`
  const team = `${project}/${encodeURIComponent(connection.team)}`

  async function send(url: string, init: RequestInit = {}) {
    const authorization = await tokens.getAuthorization()
    if (!authorization) throw new AzureDevOpsError(401, 'No personal access token')

    const response = await fetch(url, {
      ...init,
      credentials: 'omit',
      headers: {
        Authorization: authorization,
        // Without this, a bad token redirects to sign-in and looks like a network failure.
        'X-TFS-FedAuthRedirect': 'Suppress',
        ...init.headers,
      },
    })

    if (!response.ok) {
      throw new AzureDevOpsError(response.status, `Azure DevOps returned HTTP ${response.status}`)
    }
    return response
  }

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await send(url, init)
    return response.json() as Promise<T>
  }

  const get = <T>(url: string) => request<T>(`${url}?${apiVersion}`)

  const post = <T>(url: string, body: unknown) =>
    request<T>(`${url}?${apiVersion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const patch = <T>(url: string, body: unknown, contentType: string) =>
    request<T>(`${url}?${apiVersion}`, {
      method: 'PATCH',
      headers: { 'Content-Type': contentType },
      body: JSON.stringify(body),
    })

  return {
    backlogConfiguration: () => get<BacklogConfiguration>(`${team}/_apis/work/backlogconfiguration`),
    teamFieldValues: () => get<TeamFieldValues>(`${team}/_apis/work/teamsettings/teamfieldvalues`),
    queryLinks: (query: string) => post<LinkQueryResult>(`${team}/_apis/wit/wiql`, { query }),
    workItems: (ids: number[], fields: string[]) =>
      post<{ value: WorkItem[] }>(`${project}/_apis/wit/workitemsbatch`, { ids, fields }),
    workItem: (id: number) => request<WorkItem>(`${project}/_apis/wit/workitems/${id}?$expand=relations&${apiVersion}`),
    workItemUrl: (id: number) => `${organization}/_apis/wit/workItems/${id}`,
    workItemWebUrl: (id: number) => `${project}/_workitems/edit/${id}`,
    comments: (id: number) =>
      request<{ comments: WorkItemComment[] }>(
        `${project}/_apis/wit/workItems/${id}/comments?$top=200&order=asc&$expand=renderedText&${commentsApiVersion}`,
      ),
    iterations: () => get<{ value: Iteration[] }>(`${team}/_apis/work/teamsettings/iterations`),
    attachment: async (url: string) => {
      if (!isAttachmentUrl(url, connection.organization)) {
        throw new AzureDevOpsError(403, 'Not an Azure DevOps attachment')
      }
      const response = await retryOnReset(() => send(url))
      return response.blob()
    },
    updateWorkItem: (id: number, operations: PatchOperation[]) =>
      patch<WorkItem>(`${project}/_apis/wit/workitems/${id}`, operations, 'application/json-patch+json'),
    reorder: (operation: ReorderOperation) =>
      patch<{ value: { id: number; order: number }[] }>(`${team}/_apis/work/workitemsorder`, operation, 'application/json'),
  }
}

export type AzureDevOpsClient = ReturnType<typeof createClient>

export interface BacklogLevel {
  name: string
  rank: number
  workItemTypes: { name: string }[]
}

export interface BacklogConfiguration {
  portfolioBacklogs: BacklogLevel[]
  requirementBacklog: BacklogLevel
  backlogFields: { typeFields: { Order: string; Effort: string } }
}

export interface TeamFieldValue {
  value: string
  includeChildren: boolean
}

export interface TeamFieldValues {
  values: TeamFieldValue[]
}

export interface LinkQueryResult {
  workItemRelations: { source: { id: number } | null; target: { id: number } }[]
}

export interface WorkItem {
  id: number
  rev: number
  fields: Record<string, unknown>
  relations?: { rel: string; url: string }[]
}

export interface WorkItemComment {
  id: number
  renderedText: string
  createdBy: { displayName: string }
  createdDate: string
}

export interface Iteration {
  path: string
  attributes: { startDate?: string; finishDate?: string }
}

export interface PatchOperation {
  op: 'add' | 'remove' | 'test'
  path: string
  value?: unknown
}

export interface ReorderOperation {
  ids: number[]
  parentId: number
  previousId: number
  nextId: number
}
