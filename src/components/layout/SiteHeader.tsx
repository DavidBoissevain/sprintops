import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SidebarToggle } from './SidebarToggle.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

interface SiteHeaderProps {
  team: string
  refreshing: boolean
  onRefresh: () => void
}

// Follows the header in shadcn's sidebar-16 block, which sits above the sidebar.
export function SiteHeader({ team, refreshing, onRefresh }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) w-full shrink-0 items-center gap-2 px-4">
      <SidebarToggle />
      <p className="font-semibold">SprintOps</p>
      <p className="ml-2 hidden truncate text-muted-foreground sm:block">{team}</p>
      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh backlog"
                disabled={refreshing}
                onClick={onRefresh}
              />
            }
          >
            <RefreshCw className={cn(refreshing && 'animate-spin')} />
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh backlog</TooltipContent>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  )
}
