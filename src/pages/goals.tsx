import { useState } from 'react'
import { usePillars, useGoals, goalM, pillarM } from '@/hooks/use-compass'
import { Card, Button, Spinner, Badge } from '@/components/ui'
import { Plus, X, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Goal, Pillar } from '@/lib/types'

const STATUS_NEXT: Record<Goal['status'], Goal['status']> = { open: 'done', done: 'dropped', dropped: 'open' }

export function GoalsPage({ embedded = false }: { embedded?: boolean }) {
  const pillars = usePillars()
  const goals = useGoals()
  const update = goalM.useUpdate()
  const del = goalM.useDelete()

  if (pillars.isLoading || goals.isLoading) return <Spinner />

  const nextNumber = (pillars.data?.reduce((m, p) => Math.max(m, p.number ?? 0), 0) ?? 0) + 1

  return (
    <div className="space-y-5">
      {!embedded && <div>
        <h1 className="text-2xl font-semibold tracking-tight">Growth Pillars</h1>
        <p className="text-sm text-muted-foreground mt-1">Your long-term goals. Reflections score how your week ladders up to these. Edit a pillar's title with the pencil; add your own below.</p>
      </div>}

      {pillars.data?.map((p, i) => {
        const pg = goals.data?.filter((g) => g.pillar_id === p.id) ?? []
        return (
          <Card key={p.id}>
            <PillarHeader pillar={p} displayNumber={i + 1} />
            <ul className="space-y-1.5 mt-3">
              {pg.map((g) => (
                <li key={g.id} className="group flex items-center justify-between gap-3">
                  <button
                    onClick={() => update.mutate({ id: g.id, status: STATUS_NEXT[g.status] })}
                    className={cn('flex items-center gap-2 text-left text-sm', g.status === 'done' && 'line-through text-muted-foreground', g.status === 'dropped' && 'text-muted-foreground/60 italic')}
                  >
                    <span className={cn('size-3.5 shrink-0 rounded-full border-2', g.status === 'done' ? 'bg-sage border-sage' : g.status === 'dropped' ? 'border-muted-foreground/40 bg-transparent' : 'border-muted-foreground/40')} />
                    {g.goal}
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge>{g.period_label || g.horizon}</Badge>
                    <button onClick={() => del.mutate(g.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose"><X className="size-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
            <AddGoal pillarId={p.id} />
          </Card>
        )
      })}

      <AddPillar nextNumber={nextNumber} />
    </div>
  )
}

function PillarHeader({ pillar, displayNumber }: { pillar: Pillar; displayNumber: number }) {
  const update = pillarM.useUpdate()
  const del = pillarM.useDelete()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pillar.name)
  const [intent, setIntent] = useState(pillar.intent)

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-sage w-5 text-center shrink-0">{displayNumber}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pillar title" className="flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
        </div>
        <input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="What this pillar is about…" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
        <div className="flex gap-1.5">
          <Button variant="soft" className="py-1" onClick={() => { update.mutate({ id: pillar.id, name: name.trim() || pillar.name, intent: intent.trim() }); setEditing(false); toast.success('Saved') }}><Check className="size-3.5" />Save</Button>
          <Button variant="ghost" className="py-1" onClick={() => { setName(pillar.name); setIntent(pillar.intent); setEditing(false) }}>Cancel</Button>
          <button onClick={() => { if (confirm('Delete this pillar and its goals?')) del.mutate(pillar.id) }} className="ml-auto text-xs text-muted-foreground hover:text-rose">Delete pillar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-sage">{displayNumber}</span>
        <h2 className="text-base font-semibold">{pillar.name}</h2>
        <button onClick={() => setEditing(true)} className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-sage"><Pencil className="size-3.5" /></button>
      </div>
      {pillar.intent && <p className="text-sm text-muted-foreground mt-1">{pillar.intent}</p>}
    </div>
  )
}

function AddPillar({ nextNumber }: { nextNumber: number }) {
  const create = pillarM.useCreate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [intent, setIntent] = useState('')
  if (!open) return <Button variant="soft" onClick={() => setOpen(true)}><Plus className="size-4" />Add pillar</Button>
  return (
    <Card>
      <div className="space-y-2">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="New pillar title…" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
        <input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="What it's about (optional)" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
        <div className="flex gap-1.5">
          <Button variant="soft" onClick={() => { if (name.trim()) { create.mutate({ name: name.trim(), intent: intent.trim(), number: nextNumber, sort: nextNumber }); setName(''); setIntent(''); setOpen(false) } }}>Add</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </div>
    </Card>
  )
}

function AddGoal({ pillarId }: { pillarId: string }) {
  const create = goalM.useCreate()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState('')
  const [horizon, setHorizon] = useState<'quarter' | 'annual'>('quarter')
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-sage"><Plus className="size-3.5" />Add goal</button>
  return (
    <div className="mt-2 flex flex-col sm:flex-row gap-2">
      <input autoFocus value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="New goal…" className="flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
      <select value={horizon} onChange={(e) => setHorizon(e.target.value as 'quarter' | 'annual')} className="rounded border bg-background px-2 py-1.5 text-sm">
        <option value="quarter">quarter</option>
        <option value="annual">annual</option>
      </select>
      <Button variant="soft" onClick={() => { if (goal.trim()) { create.mutate({ pillar_id: pillarId, goal, horizon, period_label: horizon === 'quarter' ? 'this quarter' : 'this year' }); setGoal(''); setOpen(false) } }}>Add</Button>
    </div>
  )
}
