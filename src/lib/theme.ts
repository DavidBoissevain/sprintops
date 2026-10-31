export type Theme = 'light' | 'dark'

const storageKey = 'sprintops.theme'

// public/theme.js sets the starting theme before the first paint.
export const currentTheme = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // Storage is unavailable, so the choice lasts until the page reloads.
  }
}
