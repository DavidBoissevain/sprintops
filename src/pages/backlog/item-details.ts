import type { AzureDevOpsClient, Iteration, WorkItem } from './azure-devops.ts'
import { formatSprintDates } from './presentation.ts'

export type ItemClient = Pick<AzureDevOpsClient, 'workItem' | 'comments' | 'iterations' | 'attachment' | 'workItemWebUrl'>

export function toItemDetails({ fields }: WorkItem, effortField: string) {
  const assignedTo = fields['System.AssignedTo'] as { displayName: string } | undefined
  return {
    title: fields['System.Title'] as string,
    type: fields['System.WorkItemType'] as string,
    state: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName,
    description: fields['System.Description'] as string | undefined,
    effort: fields[effortField] as number | undefined,
    iterationPath: fields['System.IterationPath'] as string,
  }
}

// The root path has no separator and means the item isn't in a sprint. A sprint
// outside the team's list still has a name, but its dates aren't known.
export function iterationLabel(path: string, iterations: Iteration[] = []) {
  if (!path.includes('\\')) return undefined

  const { startDate, finishDate } = iterations.find((iteration) => iteration.path === path)?.attributes ?? {}
  return {
    name: path.split('\\').at(-1),
    dates: startDate && finishDate ? formatSprintDates(startDate, finishDate) : undefined,
  }
}
