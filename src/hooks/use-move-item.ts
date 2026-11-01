import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoveConflictError, moveItem, type Backlog, type MoveClient } from '../lib/backlog-api.ts'
import { applyMove, type BacklogMove } from '../lib/backlog-move.ts'
import { toasts } from '../lib/toasts.ts'

const mutationKey = ['move-item']

// Moves run one at a time, because each one is placed relative to the last.
// A failed write isn't retried or reversed: it may have landed anyway, so the
// reload afterwards shows what Azure DevOps really holds.
export function useMoveItem(client: MoveClient) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey,
    scope: { id: 'move-item' },
    mutationFn: (move: BacklogMove) => moveItem(client, move),
    onMutate: async (move) => {
      await queryClient.cancelQueries({ queryKey: ['backlog'] })
      queryClient.setQueryData<Backlog>(['backlog'], (backlog) => backlog && { ...backlog, tree: applyMove(backlog.tree, move) })
    },
    onError: (error) => {
      const reason = error instanceof MoveConflictError ? `${error.message}. ` : ''
      toasts.add({ title: 'Could not move the item', description: `${reason}Reloading the backlog to show what was saved.` })
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return undefined
      return queryClient.invalidateQueries({ queryKey: ['backlog'] })
    },
  })
}
