// Runs before the first paint, so a reload never flashes the wrong theme. It is
// a separate file because the Content Security Policy blocks inline scripts.
let savedTheme = null
try {
  savedTheme = localStorage.getItem('sprintops.theme')
} catch {
  // Storage is unavailable, so follow the system setting.
}
const dark = savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', dark)
