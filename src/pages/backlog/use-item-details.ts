import { useQuery } from '@tanstack/react-query'
import { toItemDetails, type ItemClient } from './item-details.ts'

const iterationsStaleTime = 60 * 60 * 1000

// `staleTime: 0` reloads on every opening and on return from the Azure DevOps
// tab, where an item is edited for now, while showing what's cached.
export function useItemDetails(client: ItemClient, id: number, effortField: string) {
  const details = useQuery({
    queryKey: ['work-item', id],
    queryFn: () => client.workItem(id),
    select: (workItem) => toItemDetails(workItem, effortField),
    staleTime: 0,
  })

  const comments = useQuery({
    queryKey: ['comments', id],
    queryFn: () => client.comments(id),
    select: ({ comments }) => comments,
    staleTime: 0,
  })

  const iterations = useQuery({
    queryKey: ['iterations'],
    queryFn: () => client.iterations(),
    select: ({ value }) => value,
    staleTime: iterationsStaleTime,
  })

  return { details, comments, iterations }
}
