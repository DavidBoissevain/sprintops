import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SignInProps {
  expired: boolean
  onSubmit: (pat: string) => void
}

export function SignIn({ expired, onSubmit }: SignInProps) {
  const [pat, setPat] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (pat.trim()) onSubmit(pat)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">SprintOps</h1>
        <p className="mt-1 text-muted-foreground">
          {expired
            ? 'Azure DevOps rejected this token. It may have expired, so enter a new one.'
            : 'Enter a personal access token for your Azure DevOps organization.'}
        </p>
        <form className="mt-6 grid gap-2" onSubmit={submit}>
          <Label htmlFor="pat">Personal access token</Label>
          <Input
            id="pat"
            type="password"
            autoComplete="off"
            autoFocus
            value={pat}
            onChange={(event) => setPat(event.target.value)}
          />
          <Button type="submit" className="mt-2">
            Continue
          </Button>
        </form>
      </div>
    </main>
  )
}
