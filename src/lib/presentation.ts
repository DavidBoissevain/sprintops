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
