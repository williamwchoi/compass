import { useState } from 'react'
import { useDecisions, useDecide, useResolveDecision, useReopenDecision, useDeleteDecision } from '@/hooks/use-actions'
import { Card, SectionTitle, Button, Badge, Empty } from '@/components/ui'
import { Plus, X, Scale, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Decision } from '@/lib/types'

export function DecidePage() {
  const decisions = useDecisions()
  const decide = useDecide()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [result, setResult] = useState<Decision | null>(null)

  const run = () => {
    if (!question.trim()) return toast.error('What are you deciding?')
    decide.mutate(
      { question, options: options.map((o) => o.trim()).filter(Boolean) },
      { onSuccess: (d) => setResult(d), onError: (e) => toast.error(e.message) },
    )
  }

  const open = decisions.data?.filter((d) => d.status === 'open' && d.id !== result?.id) ?? []
  const log = decisions.data?.filter((d) => d.status === 'decided') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decide</h1>
        <p className="text-sm text-muted-foreground mt-1">Stuck on a choice? Run it through your compass and heuristics.</p>
      </div>

      <Card>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What are you trying to decide? e.g. Should I take this podcast invite, or protect my deep-work time?"
          rows={2}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-2 space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1} (optional)`} className="flex-1 rounded border bg-background px-3 py-1.5 text-sm" />
              {options.length > 1 && <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-rose"><X className="size-4" /></button>}
            </div>
          ))}
          <button onClick={() => setOptions([...options, ''])} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-sage"><Plus className="size-3.5" />Add option</button>
        </div>
        <Button className="mt-3 w-full sm:w-auto" loading={decide.isPending} onClick={run}><Scale className="size-4" />Run it through my compass</Button>
      </Card>

      {result && <ResultCard d={result} fresh onClear={() => setResult(null)} />}

      {open.length > 0 && (
        <div>
          <SectionTitle sub="Decisions you've run but haven't committed to.">Open</SectionTitle>
          <div className="space-y-3">{open.map((d) => <ResultCard key={d.id} d={d} />)}</div>
        </div>
      )}

      <div>
        <SectionTitle>Decision log</SectionTitle>
        {log.length ? <div className="space-y-3">{log.map((d) => <ResultCard key={d.id} d={d} />)}</div> : <Empty>No decided choices yet.</Empty>}
      </div>
    </div>
  )
}

function ResultCard({ d, fresh, onClear }: { d: Decision; fresh?: boolean; onClear?: () => void }) {
  const resolve = useResolveDecision()
  const reopen = useReopenDecision()
  const remove = useDeleteDecision()
  const [chosen, setChosen] = useState(d.options?.[0] ?? '')
  const [nextAction, setNextAction] = useState('')
  const [reviewOn, setReviewOn] = useState('')
  const commit = () => {
    if (!chosen.trim()) return toast.error('Write what you decided')
    resolve.mutate({ id: d.id, chosen: chosen.trim(), next_action: nextAction.trim(), review_on: reviewOn }, { onSuccess: () => { toast.success('Decision closed'); onClear?.() } })
  }
  const deleteDecision = () => {
    if (!confirm(`Delete “${d.question}”? This can’t be undone.`)) return
    remove.mutate(d.id, {
      onSuccess: () => { toast.success('Decision deleted'); onClear?.() },
      onError: (error) => toast.error(error.message),
    })
  }
  return (
    <Card className={fresh ? 'border-sage ring-1 ring-sage/30' : ''}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{d.question}</p>
        <div className="flex shrink-0 items-center gap-2">
          {d.status === 'decided' && <Badge className="border-sage/40 text-sage"><CheckCircle2 className="size-3 mr-1" />Decided</Badge>}
          <button type="button" onClick={deleteDecision} disabled={remove.isPending} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-rose/10 hover:text-rose disabled:opacity-50" aria-label={`Delete decision: ${d.question}`}>
            <Trash2 className="size-3.5" />Delete
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-sage-soft/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-1">Recommendation</p>
        <p className="text-sm">{d.recommendation}</p>
      </div>

      <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{d.reasoning}</p>
      {d.ruled_out_why && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line"><span className="font-medium text-foreground">Letting go: </span>{d.ruled_out_why}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.heuristics_used?.map((h) => <Badge key={h} className="border-clay/40 text-clay">{h}</Badge>)}
      </div>
      {(d.strengths_invoked?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-1 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wiring check</p>
          <div className="flex flex-wrap gap-1.5">
            {d.strengths_invoked!.map((s, i) => (
              <span key={i} title={s.why}>
                <Badge className={s.verdict === 'feeds' ? 'border-sage/40 text-sage' : s.verdict === 'fights' ? 'border-rose/40 text-rose' : 'border-border text-muted-foreground'}>
                  {s.verdict === 'feeds' ? '⚡ feeds' : s.verdict === 'fights' ? '⛔ fights' : '· neutral'} {s.name}
                </Badge>
              </span>
            ))}
          </div>
        </div>
      )}
      {d.values_invoked?.length > 0 && (
        <ul className="mt-3 space-y-0.5 border-t pt-3 text-xs text-muted-foreground">
          {d.values_invoked.map((v, i) => <li key={i}>• {v}</li>)}
        </ul>
      )}

      {d.status === 'open' ? (
        <div className="mt-4 space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Close the loop</p>
          {d.options?.length ? <select value={chosen} onChange={(e) => setChosen(e.target.value)} className="w-full rounded border bg-background px-3 py-2"><option value="">What did you choose?</option>{d.options.map((option) => <option key={option}>{option}</option>)}</select> : <input value={chosen} onChange={(e) => setChosen(e.target.value)} placeholder="What did you decide?" className="w-full rounded border bg-background px-3 py-2" />}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_10rem]"><input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Next action (optional)" className="rounded border bg-background px-3 py-2" /><input type="date" value={reviewOn} onChange={(e) => setReviewOn(e.target.value)} aria-label="Review date" className="rounded border bg-background px-3 py-2" /></div>
          <div className="flex flex-wrap gap-2"><Button variant="soft" loading={resolve.isPending} onClick={commit}><CheckCircle2 className="size-4" />Close decision</Button>{onClear && <Button variant="ghost" onClick={onClear}>Dismiss view</Button>}</div>
        </div>
      ) : d.chosen ? (
        <div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground"><p>You chose: <span className="font-medium text-foreground">{d.chosen}</span></p>{d.next_action && <p>Next: <span className="font-medium text-foreground">{d.next_action}</span></p>}{d.review_on && <p>Review: <span className="font-medium text-foreground">{new Date(`${d.review_on}T12:00:00`).toLocaleDateString()}</span></p>}<button onClick={() => reopen.mutate(d.id, { onSuccess: () => toast.success('Decision reopened') })} className="mt-2 inline-flex items-center gap-1 font-medium hover:text-sage"><RotateCcw className="size-3" />Reopen</button></div>
      ) : null}
    </Card>
  )
}
