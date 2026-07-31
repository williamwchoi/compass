import { useState } from 'react'
import { useTodayIntention, useGenerateIntention, useSaveIntention, useDecisions, useEnergyActivities, useLogEnergyActivity, useReflections, useSaveReflection } from '@/hooks/use-actions'
import { Badge, Card, Button, Spinner, Empty } from '@/components/ui'
import { Sparkles, Wind, Scale, Pencil, Plus, X, Check, Activity, ArrowRight, NotebookPen, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Intention } from '@/lib/types'
import type { EnergyDiscomfort, EnergyMode } from '@/lib/types'

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export function TodayPage() {
  const decisions = useDecisions()
  const openDecisions = decisions.data?.filter((d) => d.status === 'open') ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2"><NotebookPen className="size-7 text-sage" />Check-in</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </div>

      <QuickCapture />

      <IntentionCard />

      <GoodTimeJournal />

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold flex items-center gap-2"><Scale className="size-4" />Open decisions</h2>
          <Link to="/decide" className="text-xs text-sage hover:underline">Decide →</Link>
        </div>
        {openDecisions.length ? (
          <ul className="space-y-1.5">
            {openDecisions.slice(0, 4).map((d) => (
              <li key={d.id}><Link to="/decide" className="text-sm hover:text-sage">• {d.question}</Link></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nothing pending. Clear head. ✦</p>}
      </Card>
    </div>
  )
}

function QuickCapture() {
  const save = useSaveReflection()
  const reflections = useReflections()
  const [text, setText] = useState('')
  const recent = reflections.data?.slice(0, 3) ?? []
  const submit = () => {
    if (!text.trim()) return toast.error('Write a thought first')
    const now = new Date().toISOString()
    save.mutate({ period: 'daily', period_start: now, period_end: now, pulled_work: {}, dashboard: {}, alignment: [], prompts: [], summary: text.trim() }, {
      onSuccess: () => { setText(''); toast.success('Thought saved') },
      onError: (error) => toast.error(error.message),
    })
  }
  return (
    <Card className="border-sage/30 bg-gradient-to-br from-sage-soft/65 to-card shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Daily reflections</h2>
          <p className="mt-1 text-sm text-muted-foreground">What are you noticing today?</p>
        </div>
        <Link to="/reflect" className="text-sm font-semibold text-sage hover:text-foreground">View all →</Link>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="A realization, tension, question, or pattern…" className="mt-3 w-full rounded-lg border bg-card px-3 py-2 leading-relaxed" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button loading={save.isPending} onClick={submit}>Save reflection</Button>
        <Link to="/reflect" className="px-2 text-sm font-medium text-muted-foreground hover:text-sage">Write a guided reflection →</Link>
      </div>
      {recent.length > 0 && <div className="mt-4 border-t border-sage/20 pt-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">Recent reflections</p><ul className="space-y-1.5">{recent.map((item) => <li key={item.id}><Link to="/reflect" className="line-clamp-2 text-xs leading-relaxed text-muted-foreground hover:text-foreground">{item.summary}</Link></li>)}</ul></div>}
    </Card>
  )
}

function IntentionCard() {
  const intention = useTodayIntention()
  const generate = useGenerateIntention()
  const save = useSaveIntention()
  const [editing, setEditing] = useState(false)

  if (intention.isLoading) return <Card><Spinner /></Card>

  if (editing) {
    return <IntentionEditor initial={intention.data ?? null} saving={save.isPending} onCancel={() => setEditing(false)}
      onSave={(data) => save.mutate(data, { onSuccess: () => { setEditing(false); toast.success('Intention saved') }, onError: (e) => toast.error(e.message) })} />
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-semibold">One focus <span className="font-normal text-muted-foreground">(optional)</span></h2>
        <div className="flex gap-1.5">
          <Button variant="ghost" className="py-1" onClick={() => setEditing(true)}><Pencil className="size-3.5" />Edit</Button>
          <Button variant="soft" className="py-1" loading={generate.isPending} onClick={() => generate.mutate(undefined, { onError: (e) => toast.error(e.message) })}>
            <Sparkles className="size-3.5" />{intention.data ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
      </div>
      {intention.data && (intention.data.top_focus.length || intention.data.drop_list.length || intention.data.note) ? (
        <div className="space-y-4">
          {intention.data.top_focus.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-2">Focus on these</p>
              <ul className="space-y-2">
                {intention.data.top_focus.map((f, i) => (
                  <li key={i} className="rounded-lg bg-sage-soft/60 px-3 py-2">
                    <p className="text-sm font-medium">{f.item}</p>
                    {f.serves && <p className="text-xs text-muted-foreground mt-0.5">serves: {f.serves}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {intention.data.drop_list.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Wind className="size-3.5" />OK to drop today</p>
              <ul className="space-y-1">
                {intention.data.drop_list.map((d, i) => <li key={i} className="text-sm text-muted-foreground line-through decoration-muted-foreground/40">{d}</li>)}
              </ul>
            </div>
          )}
          {intention.data.note && <p className="text-sm italic text-muted-foreground border-t pt-3">{intention.data.note}</p>}
        </div>
      ) : (
        <Empty>No intention yet. <button onClick={() => setEditing(true)} className="text-sage hover:underline">Add your own</button> or generate one.</Empty>
      )}
    </Card>
  )
}

function IntentionEditor({ initial, saving, onSave, onCancel }: {
  initial: Intention | null
  saving: boolean
  onSave: (data: { top_focus: { item: string; serves: string }[]; drop_list: string[]; note: string }) => void
  onCancel: () => void
}) {
  const [focus, setFocus] = useState<{ item: string; serves: string }[]>(
    initial?.top_focus?.length ? initial.top_focus : [{ item: '', serves: '' }],
  )
  const [drops, setDrops] = useState<string[]>(initial?.drop_list?.length ? initial.drop_list : [''])
  const [note, setNote] = useState(initial?.note ?? '')

  const submit = () => {
    const top_focus = focus.map((f) => ({ item: f.item.trim(), serves: f.serves.trim() })).filter((f) => f.item)
    const drop_list = drops.map((d) => d.trim()).filter(Boolean)
    onSave({ top_focus, drop_list, note: note.trim() })
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Today's intention</h2>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-sage mb-2">Focus on these</p>
      <div className="space-y-2">
        {focus.map((f, i) => (
          <div key={i} className="rounded-lg bg-sage-soft/40 p-2 space-y-1.5">
            <div className="flex gap-2">
              <input value={f.item} onChange={(e) => setFocus(focus.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} placeholder="What you'll focus on…" className="flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
              <button onClick={() => setFocus(focus.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-rose"><X className="size-4" /></button>
            </div>
            <input value={f.serves} onChange={(e) => setFocus(focus.map((x, j) => (j === i ? { ...x, serves: e.target.value } : x)))} placeholder="serves… (value or pillar — optional)" className="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
        ))}
        {focus.length < 5 && <button onClick={() => setFocus([...focus, { item: '', serves: '' }])} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-sage"><Plus className="size-3.5" />Add focus</button>}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-2 flex items-center gap-1"><Wind className="size-3.5" />OK to drop today</p>
      <div className="space-y-2">
        {drops.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input value={d} onChange={(e) => setDrops(drops.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Something you can let go…" className="flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
            <button onClick={() => setDrops(drops.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-rose"><X className="size-4" /></button>
          </div>
        ))}
        <button onClick={() => setDrops([...drops, ''])} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-sage"><Plus className="size-3.5" />Add drop</button>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-2">Note</p>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="A grounding line for today (optional)" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />

      <div className="flex gap-2 mt-3">
        <Button loading={saving} onClick={submit}><Check className="size-4" />Save</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  )
}

const modes: EnergyMode[] = ['build', 'diagnose', 'teach', 'sell', 'maintain', 'manage', 'connect', 'learn', 'other']

function GoodTimeJournal() {
  const activities = useEnergyActivities()
  const log = useLogEnergyActivity()
  const [activity, setActivity] = useState('')
  const [context, setContext] = useState('Work')
  const [mode, setMode] = useState<EnergyMode>('build')
  const [delta, setDelta] = useState(0)
  const [engagement, setEngagement] = useState(3)
  const [discomfort, setDiscomfort] = useState<EnergyDiscomfort>('none')
  const [continued, setContinued] = useState<boolean | null>(null)
  const [wantMore, setWantMore] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [details, setDetails] = useState(false)
  const recentActivities = activities.data?.slice(0, 6) ?? []

  const submit = () => {
    if (!activity.trim()) return toast.error('Name the activity')
    log.mutate({ activity: activity.trim(), context, mode, energy_before: 3, energy_after: Math.max(1, Math.min(5, 3 + delta)), engagement, discomfort, wanted_to_continue: continued, want_more_if_successful: wantMore, notes }, {
      onSuccess: () => {
        toast.success('Activity logged')
        setActivity('')
        setNotes('')
        setContinued(null)
        setWantMore(null)
        setDiscomfort('none'); setDelta(0); setEngagement(3); setDetails(false)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Activity className="size-4 text-clay" />Good Time Journal</h2>
          <p className="text-sm text-muted-foreground mt-1">Log the activity, not just the day. Two weeks of evidence will test your energy map.</p>
        </div>
        <Link to="/foundations" className="text-xs font-medium text-sage hover:underline">View energy map →</Link>
      </div>

      <div className="rounded-xl border bg-background/50 p-3 sm:p-4 space-y-4">
        <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="What did you just do?" className="w-full rounded border bg-background px-3 py-2" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ChoiceScale label="Energy change" values={[-2, -1, 0, 1, 2]} value={delta} onChange={setDelta} format={(n) => n > 0 ? `+${n}` : String(n)} />
          <ChoiceScale label="Engagement" values={[1, 2, 3, 4, 5]} value={engagement} onChange={setEngagement} />
          <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">What was the discomfort?</p><select value={discomfort} onChange={(e) => setDiscomfort(e.target.value as EnergyDiscomfort)} className="w-full rounded border bg-background px-3 py-2"><option value="none">Neither</option><option value="growth_edge">Growth edge</option><option value="drain">Genuine drain</option><option value="unclear">Not sure yet</option></select></div>
        </div>
        <button onClick={() => setDetails((value) => !value)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-sage"><ChevronDown className={cn('size-3.5 transition-transform', details && 'rotate-180')} />{details ? 'Hide details' : 'Add detail'}</button>
        {details && <div className="space-y-3 rounded-lg bg-muted/50 p-3"><div className="grid grid-cols-2 gap-2"><select value={context} onChange={(e) => setContext(e.target.value)} className="rounded border bg-background px-3 py-2"><option>Work</option><option>Personal</option><option>Relationships</option><option>Health</option></select><select value={mode} onChange={(e) => setMode(e.target.value as EnergyMode)} className="rounded border bg-background px-3 py-2 capitalize">{modes.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><SimpleBinary label="Wanted to continue?" value={continued} onChange={setContinued} /><SimpleBinary label="Want more of this?" value={wantMore} onChange={setWantMore} /></div><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What specifically stood out?" className="w-full rounded border bg-background px-3 py-2" /></div>}
        <Button loading={log.isPending} onClick={submit}><Plus className="size-4" />Log activity</Button>
      </div>

      {recentActivities.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent evidence</p>
          <div className="space-y-2">
            {recentActivities.map((entry) => {
              const delta = entry.energy_after - entry.energy_before
              return (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <span className={cn('w-9 text-center text-sm font-semibold', delta > 0 ? 'text-sage' : delta < 0 ? 'text-rose' : 'text-muted-foreground')}>{delta > 0 ? `+${delta}` : delta}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{entry.activity}</p><p className="text-xs text-muted-foreground capitalize">{entry.context} · {entry.mode} · engagement {entry.engagement}/5</p></div>
                  <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">{entry.energy_before}<ArrowRight className="size-3" />{entry.energy_after}</span>
                  {entry.discomfort !== 'none' && <Badge className={entry.discomfort === 'growth_edge' ? 'border-sage/40 text-sage' : ''}>{entry.discomfort.replace('_', ' ')}</Badge>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

function ChoiceScale({ label, values, value, onChange, format = String }: { label: string; values: number[]; value: number; onChange: (value: number) => void; format?: (value: number) => string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5">{values.map((choice) => <button type="button" key={choice} onClick={() => onChange(choice)} className={cn('min-h-10 flex-1 rounded-md border text-xs font-medium transition', value === choice ? 'border-sage bg-sage text-white' : 'hover:bg-muted')}>{format(choice)}</button>)}</div>
    </div>
  )
}

function SimpleBinary({ label, value, onChange }: { label: string; value: boolean | null; onChange: (value: boolean | null) => void }) {
  return <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</p><div className="grid grid-cols-3 gap-1">{([[true, 'Yes'], [false, 'No'], [null, 'Unsure']] as const).map(([choice, text]) => <button type="button" key={text} onClick={() => onChange(choice)} className={cn('min-h-9 rounded border text-xs', value === choice ? 'border-sage bg-sage-soft' : 'hover:bg-muted')}>{text}</button>)}</div></div>
}
