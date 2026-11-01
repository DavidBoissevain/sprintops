import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type CSSProperties } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar.tsx'
import { Backlog } from './components/Backlog.tsx'
import { SignIn } from './components/SignIn.tsx'
import { SiteHeader } from './components/SiteHeader.tsx'
import { connection } from './config.ts'
import { useMoveItem } from './hooks/use-move-item.ts'
import { AzureDevOpsError, createClient } from './lib/azure-devops.ts'
import { loadBacklog } from './lib/backlog-api.ts'
import { loadSidebarWidth, saveSidebarWidth } from './lib/sidebar-width.ts'
import { PatTokenProvider } from './lib/token-provider.ts'

const tokens = new PatTokenProvider()
const client = createClient(tokens, connection)

export default function App() {
  const queryClient = useQueryClient()
  const [signedIn, setSignedIn] = useState(() => tokens.hasToken())
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth)
  const scrollContainer = useRef<HTMLDivElement>(null)
  const moveItem = useMoveItem(client)

  const backlog = useQuery({
    queryKey: ['backlog'],
    queryFn: () => loadBacklog(client),
    enabled: signedIn,
  })

  const rejected = backlog.error instanceof AzureDevOpsError && backlog.error.status === 401

  function signIn(pat: string) {
    tokens.save(pat)
    setSignedIn(true)
    void queryClient.resetQueries({ queryKey: ['backlog'] })
  }

  function signOut() {
    tokens.clear()
    queryClient.clear()
    setSignedIn(false)
  }

  function changeSidebarWidth(width: number) {
    setSidebarWidth(width)
    saveSidebarWidth(width)
  }

  if (!signedIn || rejected) return <SignIn expired={rejected} onSubmit={signIn} />

  return (
    <SidebarProvider
      className="h-svh flex-col [--header-height:3rem]"
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <SiteHeader team={connection.team} refreshing={backlog.isFetching} onRefresh={() => backlog.refetch()} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar width={sidebarWidth} onWidthChange={changeSidebarWidth} onSignOut={signOut} />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden border-t md:peer-data-[variant=inset]:mt-0 md:peer-data-[variant=inset]:rounded-lg md:peer-data-[variant=inset]:border">
          <div className="flex h-11 shrink-0 items-center border-b border-border px-3">
            <h1 className="font-medium">Backlog</h1>
          </div>
          <div ref={scrollContainer} className="min-h-0 flex-1 overflow-y-auto">
            {backlog.isPending && <p className="p-3 text-muted-foreground">Loading the backlog…</p>}
            {backlog.isError && (
              <p role="alert" className="p-3">
                Could not load the backlog: {backlog.error.message}
              </p>
            )}
            {backlog.data && (
              <Backlog
                tree={backlog.data.tree}
                types={backlog.data.types}
                scrollContainer={scrollContainer}
                onMove={moveItem.mutate}
              />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
