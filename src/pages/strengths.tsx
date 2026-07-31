import { useStrengths } from '@/hooks/use-compass'
import { Card, Spinner, Empty, Badge } from '@/components/ui'
import { Zap, BatteryLow } from 'lucide-react'

// Strengths — the measured wiring (CliftonStrengths), a Foundations section.
// Values are what you choose; strengths are the vessel you sail.
export function StrengthsSection() {
  const strengths = useStrengths()
  if (strengths.isLoading) return <Spinner />
  const data = strengths.data ?? []
  if (!data.length) return <Empty>No strengths loaded yet.</Empty>
  const assessed = data[0]?.assessed_on ? new Date(data[0].assessed_on).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : null
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">Your measured wiring. Values are what you choose; strengths are the vessel you sail. The Decide page checks every decision against these.</p>
      {data.map((s) => (
        <Card key={s.id}>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-sage tabular-nums">{s.rank}</span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="text-base font-semibold">{s.name}</h2>
              <Badge className="border-clay/40 text-clay">{s.domain}</Badge>
            </div>
          </div>
          {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-sage-soft/60 p-3">
              <p className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-sage"><Zap className="size-3.5" />Fuels</p>
              <ul className="space-y-1 text-sm">{s.fuels?.map((f, i) => <li key={i}>• {f}</li>)}</ul>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><BatteryLow className="size-3.5" />Drains</p>
              <ul className="space-y-1 text-sm text-muted-foreground">{s.drains?.map((d, i) => <li key={i}>• {d}</li>)}</ul>
            </div>
          </div>
        </Card>
      ))}
      <Card>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">The gap is part of the profile: </span>
          no Influencing and no Relationship Building themes in the top five. Influence-shaped work (cold outreach, pitching, the networking grind)
          costs more energy than it costs most people — not a character flaw, a wiring fact. The natural influence channel is teaching.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{data[0]?.source ?? 'CliftonStrengths'}{assessed ? ` · assessed ${assessed}` : ''}</p>
      </Card>
    </div>
  )
}
