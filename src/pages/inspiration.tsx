import { useState } from 'react'
import { useInspirations, inspirationM } from '@/hooks/use-compass'
import { Button, Spinner, Empty } from '@/components/ui'
import { Heart, Plus, X, Pencil, Check, ExternalLink, Video, Quote, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Inspiration } from '@/lib/types'

/** Pull a YouTube video id out of any common URL shape, else null. */
function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([^/?]+)/)
      if (m) return m[2]
    }
    return null
  } catch { return null }
}

const domainOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }
const detectKind = (url: string): Inspiration['kind'] => (youtubeId(url) ? 'video' : 'article')

export function InspirationPage() {
  const inspirations = useInspirations()
  const list = inspirations.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Heart className="size-6 text-rose" />Inspiration</h1>
        <p className="text-sm text-muted-foreground mt-1">The videos and reads that light a fire in you. Come back here when the tank is empty.</p>
      </div>

      <AddForm nextSort={list.length} />

      {inspirations.isLoading ? <Spinner /> : list.length ? (
        <div className="space-y-4">
          {list.map((item) => <InspirationCard key={item.id} item={item} />)}
        </div>
      ) : (
        <Empty>Nothing saved yet. Paste a YouTube link or an article URL above, and it'll be here waiting the next time you need a lift.</Empty>
      )}
    </div>
  )
}

function AddForm({ nextSort }: { nextSort: number }) {
  const create = inspirationM.useCreate()
  const [mode, setMode] = useState<'link' | 'quote'>('link')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const reset = () => { setUrl(''); setTitle(''); setNote('') }

  const submit = () => {
    if (mode === 'quote') {
      const passage = note.trim()
      if (!passage) return toast.error('Type the quote first')
      create.mutate(
        { url: '', kind: 'quote', title: title.trim(), note: passage, sort: nextSort } as Partial<Inspiration>,
        { onSuccess: () => { reset(); toast.success('Saved') }, onError: (e) => toast.error(e.message) },
      )
      return
    }
    const clean = url.trim()
    if (!clean) return toast.error('Paste a link first')
    create.mutate(
      { url: clean, kind: detectKind(clean), title: title.trim(), note: note.trim(), sort: nextSort } as Partial<Inspiration>,
      { onSuccess: () => { reset(); toast.success('Saved') }, onError: (e) => toast.error(e.message) },
    )
  }

  const kind = mode === 'link' && url.trim() ? detectKind(url.trim()) : null

  const tab = (m: 'link' | 'quote', icon: React.ReactNode, label: string) => (
    <button
      onClick={() => { setMode(m); reset() }}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
        mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >{icon}{label}</button>
  )

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex gap-1 rounded-xl bg-muted/70 p-1 w-fit">
        {tab('link', <Link2 className="size-3.5" />, 'Video or link')}
        {tab('quote', <Quote className="size-3.5" />, 'Quote')}
      </div>

      {mode === 'link' ? (
        <>
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube link or article URL…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="Why does this inspire you? (optional)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </>
      ) : (
        <>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="Paste the passage that stuck with you…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Source — book, author, who said it (optional)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </>
      )}

      <div className="flex items-center gap-2">
        <Button loading={create.isPending} onClick={submit}><Plus className="size-4" />Save</Button>
        {kind && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {kind === 'video' ? <><Video className="size-3.5 text-rose" />YouTube video</> : <><ExternalLink className="size-3.5" />Article · {domainOf(url)}</>}
          </span>
        )}
      </div>
    </div>
  )
}

function InspirationCard({ item }: { item: Inspiration }) {
  const update = inspirationM.useUpdate()
  const del = inspirationM.useDelete()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [note, setNote] = useState(item.note)

  const vid = item.kind === 'video' ? youtubeId(item.url) : null
  const isQuote = item.kind === 'quote'

  const save = () => {
    update.mutate({ id: item.id, title: title.trim(), note: note.trim() } as Partial<Inspiration> & { id: string })
    setEditing(false)
  }

  if (isQuote) {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-l-4 border-l-clay bg-card p-5">
        {editing ? (
          <div className="space-y-1.5">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="The passage…" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Source" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
            <div className="flex gap-1.5">
              <Button variant="soft" className="py-1" onClick={save}><Check className="size-3.5" />Save</Button>
              <Button variant="ghost" className="py-1" onClick={() => { setTitle(item.title); setNote(item.note); setEditing(false) }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <Quote className="size-5 text-clay/70" />
            <p className="mt-2 whitespace-pre-wrap text-base font-medium leading-relaxed text-pretty">{item.note}</p>
            {item.title && <p className="mt-3 text-sm text-muted-foreground">— {item.title}</p>}
            <div className="absolute right-3 top-3 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
              <button title="Edit" onClick={() => setEditing(true)} className="rounded p-1 text-muted-foreground hover:bg-muted transition"><Pencil className="size-3.5" /></button>
              <button title="Remove" onClick={() => { if (confirm('Remove this?')) del.mutate(item.id) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose transition"><X className="size-3.5" /></button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="group overflow-hidden rounded-xl border bg-card">
      {vid ? (
        <div className="relative aspect-video w-full bg-black">
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${vid}`}
            title={item.title || 'YouTube video'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3 hover:bg-muted/60 transition">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky/15 text-sky"><ExternalLink className="size-5" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title || domainOf(item.url)}</p>
            <p className="truncate text-xs text-muted-foreground">{domainOf(item.url)}</p>
          </div>
        </a>
      )}

      <div className="p-3">
        {editing ? (
          <div className="space-y-1.5">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Why this inspires you…" className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
            <div className="flex gap-1.5">
              <Button variant="soft" className="py-1" onClick={save}><Check className="size-3.5" />Save</Button>
              <Button variant="ghost" className="py-1" onClick={() => { setTitle(item.title); setNote(item.note); setEditing(false) }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {vid && item.title && <p className="text-sm font-medium leading-snug">{item.title}</p>}
              {item.note
                ? <p className={cn('text-sm text-muted-foreground leading-relaxed', vid && item.title && 'mt-0.5')}>{item.note}</p>
                : !(vid && item.title) && <p className="text-sm text-muted-foreground/50 italic">No note yet.</p>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
              <button title="Edit" onClick={() => setEditing(true)} className="rounded p-1 text-muted-foreground hover:bg-muted transition"><Pencil className="size-3.5" /></button>
              <button title="Remove" onClick={() => { if (confirm('Remove this?')) del.mutate(item.id) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose transition"><X className="size-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
