import { ArrowUpRight, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AzureDevOpsError } from '../../lib/azure-devops.ts'
import { formatDate, initials } from '../../lib/presentation.ts'
import type { BacklogItem } from './backlog-tree.ts'
import { StatusIcon, TypeIcon } from './BacklogIcons.tsx'
import { iterationLabel, type ItemClient } from './item-details.ts'
import { RichText } from './RichText.tsx'
import { useItemDetails } from './use-item-details.ts'

function Person({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar size="sm" className={cn('shrink-0 data-[size=sm]:size-5', className)}>
      <AvatarFallback className="text-[0.5625rem] font-medium">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-6 items-start gap-2.5">
      <dt className="w-17 shrink-0 leading-6 text-muted-foreground">{label}</dt>
      <dd className="flex min-h-6 min-w-0 flex-col justify-center">{children}</dd>
    </div>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <span className="text-muted-foreground">{children}</span>

const Failure = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="text-muted-foreground">
    {children}
  </p>
)

function TextSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-11/12" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  )
}

const isGone = (error: Error | null) => error instanceof AzureDevOpsError && error.status === 404

interface ItemDialogProps {
  item: BacklogItem
  client: ItemClient
  effortField: string
  onClose: () => void
}

export function ItemDialog({ item, client, effortField, onClose }: ItemDialogProps) {
  const { details, comments, iterations } = useItemDetails(client, item.id, effortField)

  const { title, type, state, assignedTo } = details.data ?? item
  const iteration = details.data && iterationLabel(details.data.iterationPath, iterations.data)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(776px,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 text-[0.8125rem] sm:max-w-[960px]"
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2.5 pl-4 md:pl-6">
          <TypeIcon type={type} />
          <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">{type}</span>
          <span className="shrink-0 text-muted-foreground tabular-nums">#{item.id}</span>
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            nativeButton={false}
            render={<a href={client.workItemWebUrl(item.id)} target="_blank" rel="noreferrer" />}
          >
            Open in DevOps
            <ArrowUpRight />
          </Button>
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" className="text-muted-foreground" />}>
            <X />
          </DialogClose>
        </div>

        {/* On a phone the left column dissolves, so the properties can sit between the title and the text. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <div className="contents md:block md:min-w-0 md:flex-1 md:overflow-y-auto md:px-9 md:py-6">
            <DialogTitle className="order-1 px-4 pt-5 pb-4 text-[1.3rem] leading-tight font-semibold tracking-tight md:px-0 md:pt-0">
              {title}
            </DialogTitle>

            <div className="order-3 px-4 pt-5 pb-6 md:p-0">
              {/* Checked first: a deleted item can still be in the cache. */}
              {isGone(details.error) ? (
                <Failure>This item no longer exists in Azure DevOps.</Failure>
              ) : details.data ? (
                details.data.description ? (
                  <RichText html={details.data.description} loadAttachment={client.attachment} />
                ) : (
                  <Empty>No description</Empty>
                )
              ) : details.isError ? (
                <Failure>Could not load this item: {details.error.message}</Failure>
              ) : (
                <TextSkeleton />
              )}

              <h3 className="mt-7 mb-3 font-semibold">Discussion</h3>
              {comments.data ? (
                comments.data.length > 0 ? (
                  <ol className="flex flex-col gap-3.5">
                    {comments.data.map((comment) => (
                      <li key={comment.id} className="flex gap-2.5">
                        <Person name={comment.createdBy.displayName} className="data-[size=sm]:size-5.5" />
                        <div className="min-w-0 flex-1">
                          <p>
                            <span className="font-medium">{comment.createdBy.displayName}</span>{' '}
                            <span className="text-muted-foreground">{formatDate(comment.createdDate)}</span>
                          </p>
                          <RichText html={comment.renderedText} loadAttachment={client.attachment} />
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Empty>No comments</Empty>
                )
              ) : comments.isError ? (
                <Failure>Could not load the discussion: {comments.error.message}</Failure>
              ) : (
                <TextSkeleton />
              )}
            </div>
          </div>

          <dl className="order-2 flex shrink-0 flex-col gap-3 border-y bg-sidebar/40 px-4 py-4 md:w-62 md:border-y-0 md:border-l md:py-5">
            <Property label="State">
              <span className="flex items-center gap-2">
                <StatusIcon state={state} />
                {state}
              </span>
            </Property>
            <Property label="Assignee">
              {assignedTo ? (
                <span className="flex items-center gap-2">
                  <Person name={assignedTo} />
                  <span className="min-w-0 truncate">{assignedTo}</span>
                </span>
              ) : (
                <Empty>Unassigned</Empty>
              )}
            </Property>
            <Property label="Effort">
              {details.data ? (
                <span className="tabular-nums">{details.data.effort ?? <Empty>No effort</Empty>}</span>
              ) : (
                details.isPending && <Skeleton className="h-3.5 w-8" />
              )}
            </Property>
            <Property label="Iteration">
              {details.data ? (
                iteration ? (
                  <>
                    <span>{iteration.name}</span>
                    {iteration.dates && <span className="text-muted-foreground">{iteration.dates}</span>}
                  </>
                ) : (
                  <Empty>No sprint</Empty>
                )
              ) : (
                details.isPending && <Skeleton className="h-3.5 w-20" />
              )}
            </Property>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}
