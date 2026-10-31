// Every Azure DevOps call gets its credentials here, so a different sign-in
// route only needs a new implementation of this interface (decision D5).
export interface TokenProvider {
  getAuthorization(): Promise<string | null>
  clear(): void
}

const storageKey = 'sprintops.pat'

export class PatTokenProvider implements TokenProvider {
  async getAuthorization() {
    const pat = this.read()
    return pat ? `Basic ${btoa(`:${pat}`)}` : null
  }

  hasToken() {
    return this.read() !== null
  }

  save(pat: string) {
    localStorage.setItem(storageKey, pat.trim())
  }

  clear() {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Storage is unavailable, so there is nothing to clear.
    }
  }

  private read() {
    try {
      return localStorage.getItem(storageKey)
    } catch {
      return null
    }
  }
}
