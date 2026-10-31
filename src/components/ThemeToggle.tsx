import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { applyTheme, currentTheme } from '../lib/theme.ts'

export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${nextTheme} mode`

  function toggle() {
    applyTheme(nextTheme)
    setTheme(nextTheme)
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={toggle} />}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
