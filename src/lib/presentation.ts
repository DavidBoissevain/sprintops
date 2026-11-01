// Azure DevOps names people as "Last, First", sometimes with a suffix like "van der".
export function initials(displayName: string) {
  const [surname, given] = displayName.split(',', 2).map((part) => part.trim())
  const words = given ? [given, surname] : displayName.trim().split(/\s+/)
  const letters = words.length > 1 ? [words[0], words.at(-1)] : words
  return letters.map((word) => word?.[0] ?? '').join('').toUpperCase()
}

const stateProgress: Record<string, number> = {
  Approved: 0.25,
  Committed: 0.5,
  'In Progress': 0.5,
  Done: 1,
}

// How far through its workflow an item is, from 0 to 1.
export const progressOf = (state: string) => stateProgress[state] ?? 0

export function formatDate(iso: string, now = new Date()) {
  const date = new Date(iso)
  const year = date.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year })
}

// In UTC, because Azure DevOps stores sprint dates as midnight UTC.
const sprintDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export const formatSprintDates = (start: string, finish: string) =>
  `${sprintDate.format(new Date(start))} – ${sprintDate.format(new Date(finish))}`
