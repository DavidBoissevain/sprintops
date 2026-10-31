import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'

export function SidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button variant="ghost" size="icon" className={className} aria-label="Toggle sidebar" onClick={toggleSidebar}>
      <Menu />
    </Button>
  )
}
