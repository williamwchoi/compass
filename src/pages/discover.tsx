import { useState, type ReactNode } from 'react'
import { Telescope, LayoutDashboard, Flower2, Wand2, ChevronDown, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExercises } from '@/hooks/use-actions'
import type { CompletedExercise } from '@/lib/types'

type Step = { title: string; body: ReactNode }
type Exercise = {
  id: string
  name: string
  source: string
  icon: typeof LayoutDashboard
  purpose: string
  intro?: ReactNode
  steps: Step[]
}

const EXERCISES: Exercise[] = [
  {
    id: 'design-your-life',
    name: 'Design Your Life',
    source: 'Bill Burnett & Dave Evans · Stanford',
    icon: LayoutDashboard,
    purpose: 'Get unstuck by prototyping possible lives instead of overthinking the one "right" answer.',
    steps: [
      { title: 'Life Dashboard', body: 'Rate Health, Work, Play, Love from 0 to 100%. Name the gauge that\'s most off and why. (Your Reflect tab already tracks this.)' },
      { title: 'Good Time Journal', body: 'For about two weeks, log your activities. Mark each one for Engagement (bored to absorbed) and Energy (drained to charged). Circle the patterns that repeat.' },
      { title: 'Three Odyssey Plans', body: 'Sketch three different 5-year lives: (a) the path you\'re already on, (b) what you\'d do if that path vanished tomorrow, (c) what you\'d do if money and image didn\'t matter. Give each a headline.' },
      { title: 'Reframe gravity problems', body: 'If a problem can\'t be acted on, like gravity, stop trying to solve it. Reframe it into something you can actually move on.' },
      { title: 'Prototype the liveliest thread', body: 'Pick the option that feels most alive and run a small, cheap test: a conversation, a shadow day, a tiny project, before committing to it.' },
    ],
  },
  {
    id: 'flower-petals',
    name: 'The Flower (Petals) Exercise',
    source: 'Richard N. Bolles · What Color Is Your Parachute?',
    icon: Flower2,
    purpose: 'Build a full self-portrait so you choose work from who you actually are, not from job titles.',
    intro: 'Fill in one petal at a time. You are the center of the flower. When every petal is done, read them together and look for the overlaps: that\'s where the work lives.',
    steps: [
      { title: 'What you love', body: 'The fields, topics, and curiosities you\'d happily spend your days inside.' },
      { title: 'Transferable skills', body: 'Your favorite skills, the things you do well and enjoy, ranked. Not everything you can do, just what you love doing.' },
      { title: 'People environments', body: 'The kinds of people and culture you do your best work around.' },
      { title: 'Values & purpose', body: 'What you want your work to serve. What "meaningful" actually means to you.' },
      { title: 'Working conditions', body: 'The environment where you thrive: pace, autonomy, structure, remote vs. in-person.' },
      { title: 'Level & reward', body: 'The responsibility level you want and the salary range you\'re aiming for.' },
      { title: 'Geography', body: 'Where you want to live and work.' },
    ],
  },
  {
    id: 'nine-lives',
    name: 'Nine Lives',
    source: 'Graham Weaver · Stanford GSB',
    icon: Wand2,
    purpose: 'Cut past "what\'s realistic?" to find the life you\'d actually run toward, then pressure-test your real options against it.',
    intro: (
      <>
        <span className="font-medium text-foreground">Opening move:</span> write out <span className="font-medium text-foreground">nine</span> different lives you could imagine living. No filtering, no "buts." Force yourself past the obvious three. Then run each life, and each real option on your table, through the four filters below.
      </>
    ),
    steps: [
      { title: 'The Genie Question', body: 'A genie guarantees it works out. Now what do you choose? This strips the "is it viable?" filter so desire, not feasibility, drives the answer.' },
      { title: 'Energy Autopsy', body: 'From the last ~8 months, list the specific moments that gave you energy and the ones that drained you. Be concrete: actual meetings, tasks, days, not categories. Patterns beat opinions.' },
      { title: 'Fear Inversion', body: '"What would you do if you weren\'t afraid?" Write the answer you\'d give if failure and other people\'s judgment were completely off the table.' },
      { title: 'Convergence', body: 'Extract the recurring ingredients across all your answers, the themes that keep showing up. Turn them into a short scorecard, then score your real, on-the-table options against those ingredients. Once it\'s scored, the winner is usually obvious.' },
    ],
  },
]

export function DiscoverPage({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState<string | null>(EXERCISES[0].id)
  const { data: completed } = useExercises()
  const byId = new Map((completed ?? []).map((c) => [c.exercise_id, c]))

  return (
    <div className="space-y-5">
      {!embedded && <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Telescope className="size-6 text-sage" />Self-Discovery</h1>
        <p className="text-sm text-muted-foreground mt-1">The exercises you come back to when you need to get unstuck. Simplified to the steps that matter.</p>
      </div>}

      <div className="space-y-3">
        {EXERCISES.map((ex) => (
          <ExerciseCard key={ex.id} ex={ex} done={byId.get(ex.id)} open={open === ex.id} onToggle={() => setOpen(open === ex.id ? null : ex.id)} />
        ))}
      </div>
    </div>
  )
}

function ExerciseCard({ ex, done, open, onToggle }: { ex: Exercise; done?: CompletedExercise; open: boolean; onToggle: () => void }) {
  const Icon = ex.icon
  return (
    <div className={cn('rounded-xl border bg-card transition-colors', open && 'ring-1 ring-sage/30')}>
      <button onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-sage"><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold leading-tight flex items-center gap-1.5">
              {ex.name}
              {done && <span className="inline-flex items-center gap-0.5 rounded-full bg-sage-soft px-1.5 py-0.5 text-[10px] font-medium text-sage"><Check className="size-3" />Done</span>}
            </h2>
            <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{ex.source}</p>
          <p className="mt-1.5 text-sm text-muted-foreground leading-snug">{ex.purpose}</p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pl-4 sm:pl-16">
          {ex.intro && <p className="mb-3 text-sm text-muted-foreground leading-relaxed">{ex.intro}</p>}
          <ol className="space-y-3">
            {ex.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-semibold text-white tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.title}</p>
                  <div className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
          {done && <CompletedOutput done={done} />}
        </div>
      )}
    </div>
  )
}

function CompletedOutput({ done }: { done: CompletedExercise }) {
  const when = done.done_on ? new Date(done.done_on).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  return (
    <div className="mt-4 rounded-lg border border-sage/30 bg-sage/5 p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sage">
        <Sparkles className="size-3.5" />Your answers{when && <span className="font-normal normal-case tracking-normal text-muted-foreground">· {when}</span>}
      </div>
      <div className="mt-3 space-y-3">
        {done.sections.map((sec, i) => (
          <div key={i}>
            <p className="text-sm font-medium text-foreground">{sec.heading}</p>
            {sec.note && <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{sec.note}</p>}
            {sec.items && sec.items.length > 0 && (
              <ol className="mt-1 space-y-1">
                {sec.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                    <span className="text-sage tabular-nums">{j + 1}.</span><span className="min-w-0 flex-1">{it}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
      {done.source && <p className="mt-3 text-[11px] text-muted-foreground/70 italic">Source: {done.source}</p>}
    </div>
  )
}
