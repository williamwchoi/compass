import { useState } from 'react'
import { useDomains, useValues, useRules, valueM, ruleM } from '@/hooks/use-compass'
import { Card, SectionTitle, Button, Spinner, Empty } from '@/components/ui'
import { Plus, X, Pencil, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Value } from '@/lib/types'

export function CompassPage({ embedded = false }: { embedded?: boolean }) {
  const domains = useDomains()
  const values = useValues()
  const rules = useRules()
  const ruleDelete = ruleM.useDelete()

  if (domains.isLoading || values.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      {!embedded && <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Compass</h1>
        <p className="text-sm text-muted-foreground mt-1">The values you steer by, from your Life Principles. Revisit and adjust each quarter.</p>
      </div>}

      {domains.data?.map((d) => (
        <Card key={d.id}>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-2.5 rounded-full" style={{ background: d.color }} />
            <h2 className="text-base font-semibold">{d.name}</h2>
          </div>
          {d.blurb && <p className="text-sm text-muted-foreground mb-3">{d.blurb}</p>}
          <ul className="space-y-2">
            {values.data?.filter((v) => v.domain_id === d.id).map((v) => <ValueRow key={v.id} value={v} />)}
          </ul>
          <AddValue domainId={d.id} />
        </Card>
      ))}

      <Card>
        <SectionTitle sub="Pre-decided defaults so recurring choices stop costing energy.">Rules & defaults</SectionTitle>
        <div className="space-y-2">
          {rules.data?.length ? rules.data.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted px-3 py-2">
              <div>
                <p className="text-sm font-medium">{r.rule}</p>
                {r.rationale && <p className="text-xs text-muted-foreground">{r.rationale}</p>}
              </div>
              <button onClick={() => ruleDelete.mutate(r.id)} className="text-muted-foreground hover:text-rose"><X className="size-4" /></button>
            </div>
          )) : <Empty>No rules yet. Pre-decide things like "content ships Tue/Thu" so you stop re-deciding them daily.</Empty>}
        </div>
        <AddRule />
      </Card>
    </div>
  )
}

function ValueRow({ value }: { value: Value }) {
  const update = valueM.useUpdate()
  const del = valueM.useDelete()
  const [editing, setEditing] = useState(false)
  const [statement, setStatement] = useState(value.statement)
  const [detail, setDetail] = useState(value.detail)

  if (editing) {
    return (
      <li className="rounded-lg bg-muted p-2 space-y-2">
        <input value={statement} onChange={(e) => setStatement(e.target.value)} className="w-full rounded border bg-background px-2 py-1 text-sm" />
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} className="w-full rounded border bg-background px-2 py-1 text-sm" />
        <div className="flex gap-2">
          <Button variant="soft" className="py-1" onClick={() => { update.mutate({ id: value.id, statement, detail }); setEditing(false); toast.success('Saved') }}><Check className="size-3.5" />Save</Button>
          <Button variant="ghost" className="py-1" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </li>
    )
  }
  return (
    <li className="group flex items-start justify-between gap-3">
      <div>
        <span className="text-sm font-medium">{value.statement}</span>
        {value.detail && <span className="text-sm text-muted-foreground"> — {value.detail}</span>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-sage"><Pencil className="size-3.5" /></button>
        <button onClick={() => { if (confirm('Delete this value?')) del.mutate(value.id) }} className="text-muted-foreground hover:text-rose"><X className="size-3.5" /></button>
      </div>
    </li>
  )
}

function AddValue({ domainId }: { domainId: string }) {
  const create = valueM.useCreate()
  const [open, setOpen] = useState(false)
  const [statement, setStatement] = useState('')
  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-sage"><Plus className="size-3.5" />Add value</button>
  return (
    <div className="mt-3 flex gap-2">
      <input autoFocus value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="New value…" className="flex-1 rounded border bg-background px-2 py-1 text-sm" />
      <Button variant="soft" className="py-1" onClick={() => { if (statement.trim()) { create.mutate({ domain_id: domainId, statement }); setStatement(''); setOpen(false) } }}>Add</Button>
    </div>
  )
}

function AddRule() {
  const create = ruleM.useCreate()
  const [rule, setRule] = useState('')
  const [rationale, setRationale] = useState('')
  return (
    <div className="mt-3 flex flex-col sm:flex-row gap-2">
      <input value={rule} onChange={(e) => setRule(e.target.value)} placeholder="New rule…" className="flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
      <input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="why (optional)" className="flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
      <Button variant="soft" onClick={() => { if (rule.trim()) { create.mutate({ rule, rationale }); setRule(''); setRationale('') } }}>Add rule</Button>
    </div>
  )
}
