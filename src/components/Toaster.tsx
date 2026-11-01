import { Toast } from '@base-ui/react/toast'
import { X } from 'lucide-react'

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
      <Toast.Content className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Toast.Title className="font-medium" />
          <Toast.Description className="text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label="Dismiss"
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ))
}

export function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  )
}
