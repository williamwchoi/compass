import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Compass } from 'lucide-react'
import { getKey, setKey, verifyKey, isGated } from '@/lib/api'
import { Button } from '@/components/ui'

type State = 'checking' | 'locked' | 'open'

export function Gate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('checking')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!(await isGated())) return setState('open') // no password required (local)
      const existing = getKey()
      if (existing && (await verifyKey(existing))) return setState('open')
      setState('locked')
    })()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    if (await verifyKey(pw)) { setKey(pw); setState('open') }
    else setError('Incorrect password')
    setBusy(false)
  }

  if (state === 'checking') return <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>
  if (state === 'open') return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4 text-center">
        <Compass className="mx-auto size-8 text-sage" />
        <div>
          <h1 className="text-lg font-semibold">Compass</h1>
          <p className="text-sm text-muted-foreground">Enter your password to continue.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border bg-background px-3 py-2 text-center"
        />
        {error && <p className="text-sm text-rose">{error}</p>}
        <Button type="submit" loading={busy} className="w-full">Unlock</Button>
      </form>
    </div>
  )
}
