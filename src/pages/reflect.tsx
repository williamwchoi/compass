import { useState } from 'react'
import { useDraftReflection, useSaveReflection, useReflections, useUpdateReflection, useDeleteReflection } from '@/hooks/use-actions'
import { Card, SectionTitle, Button, Badge, Empty, Spinner } from '@/components/ui'
import { NotebookPen, Sparkles, PenLine, Pencil, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ReflectionDraft, Reflection } from '@/lib/types'

const PERIODS = ['daily', 'weekly', 'monthly', 'quarterly'] as const
const DASH_KEYS = ['health', 'work', 'play', 'love'] as const

export function ReflectPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('weekly')
  const [draft, setDraft] = useState<ReflectionDraft | null>(null)
  const [writing, setWriting] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const drafting = useDraftReflection()
  const save = useSaveReflection()
  const reflections = useReflections()

  const generate = () => {
    setDraft(null); setWriting(false); setAnswers({})
    drafting.mutate(period, { onSuccess: (d) => setDraft(d), onError: (e) => toast.error(e.message) })
  }

  const commit = () => {
    if (!draft) return
    const prompts = draft.prompts.map((p, i) => ({ q: p.q, a: answers[i] ?? '' }))
    save.mutate({ ...draft, prompts }, { onSuccess: () => { toast.success('Reflection saved'); setDraft(null); setAnswers({}) } })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><NotebookPen className="size-6 text-sage" />Reflect</h1>
        <p className="text-sm text-muted-foreground mt-1">Let Claude draft from your work, or just jot your own thoughts.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={cn('px-3 py-1.5 text-sm capitalize', period === p ? 'bg-sage text-white' : 'hover:bg-muted')}>{p}</button>
            ))}
          </div>
          <Button loading={drafting.isPending} onClick={generate}><Sparkles className="size-4" />Draft {period} reflection</Button>
          <Button variant="soft" onClick={() => { setDraft(null); setWriting(true) }}><PenLine className="size-4" />Write your own</Button>
        </div>
      </Card>

      {writing && <FreeReflection period={period} saving={save.isPending} onCancel={() => setWriting(false)}
        onSave={(body) => save.mutate(body, { onSuccess: () => { toast.success('Reflection saved'); setWriting(false) } })} />}

      {drafting.isPending && <Card><Spinner /><p className="text-center text-sm text-muted-foreground">Pulling your work and reflecting…</p></Card>}

      {draft && (
        <Card className="border-sage ring-1 ring-sage/30 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-1">What you did</p>
            <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={4} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">
              From {draft.pulled_work.sessions.length} sessions · {draft.pulled_work.activity.length} activity events · {draft.pulled_work.commits.reduce((n, c) => n + c.lines.length, 0)} commits
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Health · Work · Play · Love</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DASH_KEYS.map((k) => {
                const cell = draft.dashboard?.[k] ?? { score: 3, note: '' }
                return (
                  <div key={k} className="rounded-lg bg-muted p-2">
                    <p className="text-xs font-medium capitalize mb-1">{k}</p>
                    <div className="flex items-baseline gap-1"><span className="text-2xl font-semibold text-clay">{cell.score}</span><span className="text-xs text-muted-foreground">/5</span></div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{cell.note}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Alignment with your compass</p>
            <div className="space-y-2">
              {draft.alignment?.map((a, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm"><span className="font-medium">{a.name} <Badge className="ml-1">{a.kind}</Badge></span><span className="text-muted-foreground">{a.score}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-sage" style={{ width: `${a.score}%` }} /></div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.why}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guided prompts</p>
            {draft.prompts?.map((p, i) => (
              <div key={i}>
                <p className="text-sm font-medium mb-1">{p.q}</p>
                <textarea value={answers[i] ?? ''} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} rows={2} placeholder="…" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button loading={save.isPending} onClick={commit}>Save reflection</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </Card>
      )}

      <div>
        <SectionTitle>Past reflections</SectionTitle>
        {reflections.isLoading ? <Spinner /> : reflections.data?.length ? (
          <div className="space-y-3">
            {reflections.data.map((r) => <PastReflection key={r.id} r={r} />)}
          </div>
        ) : <Empty>No saved reflections yet.</Empty>}
      </div>
    </div>
  )
}

function PastReflection({ r }: { r: Reflection }) {
  const update = useUpdateReflection()
  const del = useDeleteReflection()
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState(r.summary)

  const save = () => {
    if (!summary.trim()) return toast.error('Reflection can’t be empty')
    update.mutate({ id: r.id, summary: summary.trim() }, {
      onSuccess: () => { toast.success('Updated'); setEditing(false) },
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-1">
        <Badge className="capitalize border-sage/40 text-sage">{r.period}</Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
          {!editing && (
            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
              <button title="Edit" onClick={() => { setSummary(r.summary); setEditing(true) }} className="rounded p-1 text-muted-foreground hover:bg-muted transition"><Pencil className="size-3.5" /></button>
              <button title="Delete" onClick={() => { if (confirm('Delete this reflection?')) del.mutate(r.id, { onSuccess: () => toast.success('Deleted') }) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose transition"><Trash2 className="size-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed" />
          <div className="flex gap-1.5">
            <Button variant="soft" className="py-1" loading={update.isPending} onClick={save}><Check className="size-3.5" />Save</Button>
            <Button variant="ghost" className="py-1" onClick={() => setEditing(false)}><X className="size-3.5" />Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{r.summary}</p>
      )}
    </Card>
  )
}

function FreeReflection({ period, saving, onSave, onCancel }: {
  period: (typeof PERIODS)[number]
  saving: boolean
  onSave: (body: unknown) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [showScores, setShowScores] = useState(false)

  const submit = () => {
    if (!text.trim()) return toast.error('Jot something first')
    const dashboard = showScores
      ? DASH_KEYS.reduce((acc, k) => { if (scores[k]) acc[k] = { score: scores[k], note: '' }; return acc }, {} as Record<string, { score: number; note: string }>)
      : {}
    const today = new Date().toISOString()
    onSave({ period, period_start: today, period_end: today, pulled_work: {}, dashboard, alignment: [], prompts: [], summary: text.trim() })
  }

  return (
    <Card className="border-sage ring-1 ring-sage/30 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-1">Your thoughts ({period})</p>
        <textarea
          autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={7}
          placeholder="What's on your mind? What went well, what didn't, what are you noticing, what matters right now…"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed"
        />
      </div>

      <div>
        <button onClick={() => setShowScores((v) => !v)} className="text-xs font-medium text-muted-foreground hover:text-sage">
          {showScores ? '− Hide' : '+ Add'} Health · Work · Play · Love scores (optional)
        </button>
        {showScores && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DASH_KEYS.map((k) => (
              <div key={k} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm font-medium capitalize">{k}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setScores({ ...scores, [k]: n })}
                      className={cn('size-7 rounded text-xs font-medium transition', scores[k] === n ? 'bg-clay text-white' : 'bg-background hover:bg-card')}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button loading={saving} onClick={submit}>Save reflection</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  )
}
