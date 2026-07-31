import { useState } from 'react'
import { CompassPage } from '@/pages/compass'
import { GoalsPage } from '@/pages/goals'
import { DiscoverPage } from '@/pages/discover'
import { StrengthsSection } from '@/pages/strengths'
import { useEnergyProfile, useUsageSummary } from '@/hooks/use-actions'
import { Badge, Card, Empty, Spinner } from '@/components/ui'
import { LibraryBig, Compass, Fingerprint, Target, Zap, Telescope, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'values', label: 'Values & rules', icon: Compass },
  { id: 'strengths', label: 'Strengths', icon: Fingerprint },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'energy', label: 'Energy map', icon: Zap },
  { id: 'exercises', label: 'Exercises', icon: Telescope },
  { id: 'usage', label: 'App use', icon: Activity },
] as const
type FoundationTab = (typeof tabs)[number]['id']

export function FoundationsPage() {
  const [tab, setTab] = useState<FoundationTab>('values')
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-balance"><LibraryBig className="size-7 text-sage" />Foundations</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">The durable material beneath your decisions: values, goals, energy patterns, and the exercises that helped you discover them.</p>
      </header>
      <nav aria-label="Foundation sections" className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1.5 sm:flex">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={cn('flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition active:scale-[.98]', tab === item.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <item.icon className="size-4" />{item.label}
          </button>
        ))}
      </nav>
      {tab === 'values' && <CompassPage embedded />}
      {tab === 'strengths' && <StrengthsSection />}
      {tab === 'goals' && <GoalsPage embedded />}
      {tab === 'energy' && <EnergyFoundation />}
      {tab === 'exercises' && <DiscoverPage embedded />}
      {tab === 'usage' && <UsageFoundation />}
    </div>
  )
}

function UsageFoundation() {
  const usage = useUsageSummary()
  if (usage.isLoading) return <Spinner />
  if (!usage.data?.length) return <Empty>Usage tracking starts now. Return after a week to see which parts of Compass are earning their place.</Empty>
  return <div className="space-y-3"><div><h2 className="text-lg font-semibold">Last 30 days</h2><p className="text-sm text-muted-foreground">Private first-party events only. Journal and decision content is never copied into telemetry.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{usage.data.map((item) => <Card key={`${item.feature}-${item.event_name}`} className="shadow-none"><p className="text-xs font-medium text-muted-foreground">{item.feature} · {item.event_name.replaceAll('_', ' ')}</p><div className="mt-2 flex items-end justify-between"><p className="text-3xl font-semibold tabular-nums">{item.events}</p><p className="text-xs text-muted-foreground">{item.active_days} active day{item.active_days === 1 ? '' : 's'}</p></div></Card>)}</div></div>
}

function EnergyFoundation() {
  const profile = useEnergyProfile()
  if (profile.isLoading) return <Spinner />
  const byKind = (kind: 'fuel' | 'drain' | 'pattern' | 'principle') => profile.data?.filter((item) => item.kind === kind) ?? []
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EnergyGroup title="What fuels me" items={byKind('fuel')} tone="fuel" />
        <EnergyGroup title="What drains me" items={byKind('drain')} tone="drain" />
        <EnergyGroup title="Patterns to watch" items={byKind('pattern')} tone="pattern" />
        <EnergyGroup title="Design principles" items={byKind('principle')} tone="principle" />
      </div>
    </div>
  )
}

function EnergyGroup({ title, items, tone }: { title: string; items: { id: string; statement: string; detail: string }[]; tone: string }) {
  return (
    <Card className="shadow-none">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><Badge>{tone}</Badge></div>
      <ul className="space-y-3">{items.map((item) => <li key={item.id}><p className="text-sm font-medium">{item.statement}</p>{item.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>}</li>)}</ul>
    </Card>
  )
}
