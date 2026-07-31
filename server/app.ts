import express from 'express'
import cors from 'cors'
import { execSync } from 'child_process'
import { pool, HAS_COMMAND_CENTER } from './db.js'
import { askJSON, type CompassContext } from './claude.js'
import { USER_NAME } from './config.js'

export const app = express()
app.use(cors())
app.use(express.json())

// ─── simple shared-password gate ─────────────────────────────────────
// If COMPASS_PASSWORD is set (it is in prod), every /api route except
// /api/health requires a matching `x-compass-key` header. No password set
// (local dev) → open. This protects personal data on the public URL.
const GATE = process.env.COMPASS_PASSWORD
app.use('/api', (req, res, next) => {
  if (!GATE || req.path === '/health') return next()
  if (req.get('x-compass-key') === GATE) return next()
  res.status(401).json({ error: 'unauthorized' })
})

let usageReady = false
async function ensureUsage() {
  if (usageReady) return
  await pool.query(`create table if not exists compass_usage_events (
    id uuid primary key default gen_random_uuid(),
    session_id text default '',
    event_name text not null,
    feature text not null,
    route text default '',
    metadata jsonb default '{}',
    created_at timestamptz default now()
  )`)
  await pool.query('create index if not exists compass_usage_events_recent on compass_usage_events(created_at desc, feature)')
  usageReady = true
}
app.use('/api/usage', (_req, _res, next) => { ensureUsage().then(() => next()).catch(next) })
app.post('/api/usage/events', wrap(async (req, res) => {
  const { session_id, event_name, feature, route, metadata } = req.body as Record<string, unknown>
  if (!String(event_name ?? '').trim() || !String(feature ?? '').trim()) return res.status(400).json({ error: 'event_name and feature required' })
  await pool.query(
    'INSERT INTO compass_usage_events (session_id, event_name, feature, route, metadata) VALUES ($1,$2,$3,$4,$5)',
    [String(session_id ?? '').slice(0, 80), String(event_name).slice(0, 80), String(feature).slice(0, 80), String(route ?? '').slice(0, 160), JSON.stringify(metadata ?? {})],
  )
  res.json({ ok: true })
}))
app.get('/api/usage/summary', wrap(async (_req, res) => {
  const { rows } = await pool.query(`SELECT feature, event_name, count(*)::int AS events,
    count(DISTINCT created_at::date)::int AS active_days, max(created_at) AS last_used_at
    FROM compass_usage_events WHERE created_at >= now() - interval '30 days'
    GROUP BY feature, event_name ORDER BY events DESC, feature`)
  res.json(rows)
}))

// ─── helpers ─────────────────────────────────────────────────────────
// Function declaration (hoisted) on purpose: route blocks above this point
// (e.g. /api/usage) call wrap() at module load — a const arrow would TDZ-crash.
function wrap(fn: (req: express.Request, res: express.Response) => Promise<unknown>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => fn(req, res).catch(next)
}

async function patchRow(table: string, id: string, fields: Record<string, unknown>, res: express.Response) {
  const keys = Object.keys(fields)
  if (!keys.length) return res.status(400).json({ error: 'No fields' })
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  await pool.query(`UPDATE ${table} SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => fields[k])])
  res.json({ ok: true })
}

async function loadContext(): Promise<CompassContext> {
  const { rows: domains } = await pool.query('SELECT * FROM compass_domains WHERE active ORDER BY sort, name')
  const { rows: values } = await pool.query('SELECT * FROM compass_values ORDER BY sort')
  const { rows: pillars } = await pool.query('SELECT * FROM compass_pillars ORDER BY sort, number')
  const { rows: goals } = await pool.query("SELECT * FROM compass_goals WHERE status <> 'dropped' ORDER BY sort")
  const { rows: rules } = await pool.query('SELECT * FROM compass_rules WHERE active ORDER BY sort')
  return {
    domains: domains.map((d) => ({
      name: d.name,
      blurb: d.blurb,
      values: values.filter((v) => v.domain_id === d.id).map((v) => ({ statement: v.statement, detail: v.detail })),
    })),
    pillars: pillars.map((p) => ({
      number: p.number,
      name: p.name,
      intent: p.intent,
      goals: goals.filter((g) => g.pillar_id === p.id).map((g) => ({ horizon: g.horizon, goal: g.goal, status: g.status })),
    })),
    rules: rules.map((r) => ({ rule: r.rule, rationale: r.rationale })),
  }
}

const EMPTY_WORK = { sessions: [], activity: [], decisions: [], commits: [] as { project: string; lines: string[] }[] }

// Pull completed work for a reflection window from the Command Center DB + git.
// Only meaningful locally; in the cloud (no cc_* tables / no repos) it returns empty.
async function pullWork(start: string, end: string) {
  const { rows: decisions } = await pool.query(
    'SELECT question, recommendation, chosen, status, created_at FROM compass_decisions WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at',
    [start, end],
  )
  if (!HAS_COMMAND_CENTER) return { ...EMPTY_WORK, decisions }

  const { rows: sessions } = await pool.query(
    `SELECT s.summary, s.items, s.created_at, p.name AS project
     FROM cc_sessions s LEFT JOIN cc_projects p ON p.id = s.project_id
     WHERE s.created_at >= $1 AND s.created_at < $2 ORDER BY s.created_at`,
    [start, end],
  )
  const { rows: activity } = await pool.query(
    `SELECT a.event_type, a.title, a.detail, a.created_at, p.name AS project
     FROM cc_activity a LEFT JOIN cc_projects p ON p.id = a.project_id
     WHERE a.created_at >= $1 AND a.created_at < $2 ORDER BY a.created_at`,
    [start, end],
  )
  const { rows: repos } = await pool.query("SELECT name, repo_path FROM cc_projects WHERE repo_path IS NOT NULL AND repo_path <> ''")
  const commits: { project: string; lines: string[] }[] = []
  for (const r of repos) {
    try {
      const out = execSync(
        `git -C "${r.repo_path}" log --since="${start}" --until="${end}" --pretty=format:"%s" --no-merges`,
        { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] },
      ).trim()
      if (out) commits.push({ project: r.name, lines: out.split('\n').slice(0, 30) })
    } catch { /* repo missing or not git — skip */ }
  }
  return { sessions, activity, decisions, commits }
}

async function openNextSteps(): Promise<{ step: string; project: string | null }[]> {
  if (!HAS_COMMAND_CENTER) return []
  const { rows } = await pool.query(
    `SELECT ns.step, p.name AS project FROM cc_next_steps ns
     LEFT JOIN cc_projects p ON p.id = ns.project_id WHERE ns.is_done = false ORDER BY ns.priority DESC LIMIT 40`,
  )
  return rows
}

function periodWindow(period: string): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)
  if (period === 'daily') start.setDate(start.getDate() - 1)
  else if (period === 'weekly') start.setDate(start.getDate() - 7)
  else if (period === 'monthly') start.setMonth(start.getMonth() - 1)
  else start.setMonth(start.getMonth() - 3) // quarterly
  return { start: start.toISOString(), end: end.toISOString() }
}

// ─── health ──────────────────────────────────────────────────────────
app.get('/api/health', wrap(async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true, gated: !!GATE, hasCommandCenter: HAS_COMMAND_CENTER, ts: new Date().toISOString() })
}))

// ─── generic CRUD factory for the simple tables ──────────────────────
function crud(path: string, table: string, order: string) {
  app.get(`/api/${path}`, wrap(async (_req, res) => {
    const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY ${order}`)
    res.json(rows)
  }))
  app.post(`/api/${path}`, wrap(async (req, res) => {
    const fields = req.body as Record<string, unknown>
    const keys = Object.keys(fields)
    const cols = keys.join(', ')
    const ph = keys.map((_, i) => `$${i + 1}`).join(', ')
    const { rows } = await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${ph}) RETURNING *`, keys.map((k) => fields[k]))
    res.json(rows[0])
  }))
  app.patch(`/api/${path}/:id`, wrap(async (req, res) => patchRow(table, String(req.params.id), req.body, res)))
  app.delete(`/api/${path}/:id`, wrap(async (req, res) => {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  }))
}

crud('domains', 'compass_domains', 'sort, name')
crud('values', 'compass_values', 'sort')
crud('pillars', 'compass_pillars', 'sort, number')
crud('goals', 'compass_goals', 'sort')
crud('rules', 'compass_rules', 'sort')

// Inspiration: self-provision the table on first hit (additive, idempotent).
let inspirationsReady = false
async function ensureInspirations() {
  if (inspirationsReady) return
  await pool.query(`create table if not exists compass_inspirations (
    id uuid primary key default gen_random_uuid(),
    kind text default 'video',
    url text not null,
    title text default '',
    note text default '',
    sort int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`)
  inspirationsReady = true
}
app.use('/api/inspirations', (_req, _res, next) => { ensureInspirations().then(() => next()).catch(next) })
crud('inspirations', 'compass_inspirations', 'sort, created_at desc')

// Completed self-discovery exercises: the actual outputs of the Discover-page
// exercises (Nine Lives, Flower, Design Your Life…), so a run is captured once
// and re-read when reflecting on values. Self-provision + seed on first hit.
// exercise_id matches the Discover card id. sections: [{heading, items[], note}].
let exercisesReady = false
async function ensureExercises() {
  if (exercisesReady) return
  await pool.query(`create table if not exists compass_exercises (
    id uuid primary key default gen_random_uuid(),
    exercise_id text not null,
    title text default '',
    done_on date,
    source text default '',
    sections jsonb default '[]',
    sort int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`)
  // Content (the actual completed exercises) is not seeded here — it lives in
  // scripts/seed-data.ts and is loaded via `npm run db:seed`. This function only
  // guarantees the table exists.
  exercisesReady = true
}
app.use('/api/exercises', (_req, _res, next) => { ensureExercises().then(() => next()).catch(next) })
crud('exercises', 'compass_exercises', 'sort, created_at')

// ─── strengths (CliftonStrengths — measured wiring) ──────────────────
// Self-provision + seed on first hit so prod (Neon) needs no manual migration.
let strengthsReady = false
async function ensureStrengths() {
  if (strengthsReady) return
  await pool.query(`create table if not exists compass_strengths (
    id uuid primary key default gen_random_uuid(),
    rank int not null,
    name text not null unique,
    domain text not null default '',
    description text default '',
    fuels jsonb default '[]',
    drains jsonb default '[]',
    source text default 'CliftonStrengths',
    assessed_on date,
    sort int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`)
  await pool.query(`alter table compass_decisions add column if not exists strengths_invoked jsonb default '[]'`)
  // Content (your measured strengths) is not seeded here — it lives in
  // scripts/seed-data.ts and is loaded via `npm run db:seed`. This function only
  // guarantees the table + columns exist.
  strengthsReady = true
}
app.use('/api/strengths', (_req, _res, next) => { ensureStrengths().then(() => next()).catch(next) })
crud('strengths', 'compass_strengths', 'rank')

// ─── decision filter ─────────────────────────────────────────────────
let decisionFieldsReady = false
async function ensureDecisionFields() {
  if (decisionFieldsReady) return
  await pool.query("ALTER TABLE compass_decisions ADD COLUMN IF NOT EXISTS next_action text default ''")
  await pool.query('ALTER TABLE compass_decisions ADD COLUMN IF NOT EXISTS review_on date')
  decisionFieldsReady = true
}
app.use('/api/decide', (_req, _res, next) => { ensureDecisionFields().then(() => next()).catch(next) })
app.use('/api/decisions', (_req, _res, next) => { ensureDecisionFields().then(() => next()).catch(next) })

app.post('/api/decide', wrap(async (req, res) => {
  const { question, options } = req.body as { question: string; options?: string[] }
  if (!question) return res.status(400).json({ error: 'question required' })
  const normalize = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2))
  const incoming = normalize(question)
  const { rows: existing } = await pool.query("SELECT question FROM compass_decisions WHERE status = 'open' ORDER BY created_at DESC LIMIT 30")
  for (const row of existing) {
    const prior = normalize(row.question)
    const overlap = [...incoming].filter((word) => prior.has(word)).length
    const similarity = overlap / Math.max(1, Math.min(incoming.size, prior.size))
    if (similarity >= 0.76) return res.status(409).json({ error: 'A similar decision is already open. Resolve that decision instead of creating another.' })
  }
  await ensureStrengths()
  const ctx = await loadContext()
  const { rows: strengths } = await pool.query('SELECT rank, name, domain, description, fuels, drains FROM compass_strengths ORDER BY rank')
  const opts = (options ?? []).filter(Boolean)
  const wiring = strengths.length
    ? [
        `${USER_NAME}'s measured strengths (in order):`,
        ...strengths.map((s) => `${s.rank}. ${s.name} (${s.domain}) — ${s.description} Fuels: ${(s.fuels ?? []).join('; ')}. Drains: ${(s.drains ?? []).join('; ')}.`),
      ].join('\n')
    : ''
  const user = [
    `${USER_NAME} is facing this decision: "${question}"`,
    opts.length ? `Options on the table:\n${opts.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : 'No explicit options were listed — surface the real choice and a clear path.',
    wiring,
    '',
    'Run this through their compass, pre-decided rules, AND their strengths. Return JSON:',
    '{"recommendation": "<the clear call, 1-2 sentences>", "reasoning": "<why, referencing their values; plain language>", "heuristics_used": ["<rule or value name>", ...], "values_invoked": ["<value statement>", ...], "strengths_check": [{"name": "<strength name>", "verdict": "feeds|fights|neutral", "why": "<one short clause>"}], "ruled_out_why": "<why the other paths lose, or how to drop/defer them>"}',
    'In strengths_check, only include strengths this decision meaningfully feeds or fights (1-4 rows; skip neutral unless it is the honest answer across the board).',
    'Bias toward REDUCING their load: if an option is not correlated to long-term goals, say so and give them permission to drop or defer it.',
  ].filter(Boolean).join('\n')
  const out = await askJSON<{ recommendation: string; reasoning: string; heuristics_used: string[]; values_invoked: string[]; strengths_check: { name: string; verdict: string; why: string }[]; ruled_out_why: string }>({ ctx, user, deep: true, maxTokens: 1400 })
  const { rows } = await pool.query(
    `INSERT INTO compass_decisions (question, options, recommendation, reasoning, heuristics_used, values_invoked, strengths_invoked)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [question, JSON.stringify(opts), out.recommendation, out.reasoning, JSON.stringify(out.heuristics_used ?? []), JSON.stringify(out.values_invoked ?? []), JSON.stringify(out.strengths_check ?? [])],
  )
  res.json({ ...rows[0], ruled_out_why: out.ruled_out_why })
}))

app.get('/api/decisions', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM compass_decisions ORDER BY created_at DESC LIMIT 100')
  res.json(rows)
}))
app.patch('/api/decisions/:id', wrap(async (req, res) => {
  const f = req.body as Record<string, unknown>
  if (f.status === 'decided' && !f.decided_at) f.decided_at = new Date().toISOString()
  return patchRow('compass_decisions', String(req.params.id), f, res)
}))
app.delete('/api/decisions/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM compass_decisions WHERE id = $1', [req.params.id])
  res.json({ ok: true })
}))

// ─── daily focus / intention ─────────────────────────────────────────
app.get('/api/intention/today', wrap(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM compass_intentions WHERE for_date = CURRENT_DATE")
  res.json(rows[0] ?? null)
}))

// Manual save / edit of today's intention (no Claude).
app.put('/api/intention', wrap(async (req, res) => {
  const { top_focus, drop_list, note } = req.body as { top_focus?: unknown[]; drop_list?: string[]; note?: string }
  const { rows } = await pool.query(
    `INSERT INTO compass_intentions (for_date, top_focus, drop_list, note, source)
     VALUES (CURRENT_DATE, $1, $2, $3, 'manual')
     ON CONFLICT (for_date) DO UPDATE SET top_focus = $1, drop_list = $2, note = $3, source = 'manual'
     RETURNING *`,
    [JSON.stringify(top_focus ?? []), JSON.stringify(drop_list ?? []), note ?? ''],
  )
  res.json(rows[0])
}))

app.post('/api/intention', wrap(async (_req, res) => {
  const ctx = await loadContext()
  const nextSteps = await openNextSteps()
  const work = HAS_COMMAND_CENTER ? await pullWork(periodWindow('daily').start, periodWindow('daily').end) : EMPTY_WORK
  const user = [
    `Generate today's grounding intention for ${USER_NAME}.`,
    nextSteps.length ? `Open next steps across their projects:\n${nextSteps.map((n) => `- [${n.project ?? '—'}] ${n.step}`).join('\n')}` : 'No external task list is available — work from their values, pillars, and goals.',
    work.sessions.length ? `What they worked on in the last 24h:\n${work.sessions.map((s: any) => `- ${s.project ?? '—'}: ${s.summary}`).join('\n')}` : '',
    '',
    'Pick the 1-3 things that ACTUALLY move their values and pillars forward today (favor important-not-urgent work).',
    'Then explicitly list things they can drop or defer guilt-free today, to reduce decision fatigue.',
    'Return JSON: {"top_focus": [{"item": "<concrete focus>", "serves": "<value or pillar it serves>"}], "drop_list": ["<thing they can let go today>"], "note": "<one warm grounding line>"}',
    'Max 3 focus items. Be ruthless about protecting their time and energy.',
  ].filter(Boolean).join('\n')
  const out = await askJSON<{ top_focus: { item: string; serves: string }[]; drop_list: string[]; note: string }>({ ctx, user, maxTokens: 900 })
  const { rows } = await pool.query(
    `INSERT INTO compass_intentions (for_date, top_focus, drop_list, note, source)
     VALUES (CURRENT_DATE, $1, $2, $3, 'claude')
     ON CONFLICT (for_date) DO UPDATE SET top_focus = $1, drop_list = $2, note = $3, source = 'claude'
     RETURNING *`,
    [JSON.stringify(out.top_focus ?? []), JSON.stringify(out.drop_list ?? []), out.note ?? ''],
  )
  res.json(rows[0])
}))

// ─── energy / Good Time Journal ──────────────────────────────────────
let energyJournalReady = false
async function ensureEnergyJournal() {
  if (energyJournalReady) return
  await pool.query(`create table if not exists compass_energy_profile (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in ('fuel', 'drain', 'pattern', 'principle')),
    statement text not null,
    detail text default '',
    provenance text default '',
    source_url text default '',
    source_date date,
    adopted boolean default true,
    sort int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (kind, statement)
  )`)
  await pool.query(`create table if not exists compass_energy_activities (
    id uuid primary key default gen_random_uuid(),
    occurred_on date not null default current_date,
    activity text not null,
    context text not null default 'personal',
    mode text not null default 'build',
    energy_before int not null check (energy_before between 1 and 5),
    energy_after int not null check (energy_after between 1 and 5),
    engagement int not null check (engagement between 1 and 5),
    discomfort text not null default 'none' check (discomfort in ('none', 'drain', 'growth_edge', 'unclear')),
    wanted_to_continue boolean,
    want_more_if_successful boolean,
    notes text default '',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`)
  await pool.query('create index if not exists compass_energy_activity_date on compass_energy_activities(occurred_on desc, created_at desc)')
  // Content (your baseline energy fuels/drains) is not seeded here — it lives in
  // scripts/seed-data.ts and is loaded via `npm run db:seed`. This function only
  // guarantees the tables exist.
  energyJournalReady = true
}
app.use('/api/energy', (_req, _res, next) => { ensureEnergyJournal().then(() => next()).catch(next) })

app.get('/api/energy/recent', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM compass_energy ORDER BY for_date DESC LIMIT 30')
  res.json(rows)
}))

app.get('/api/energy/profile', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM compass_energy_profile WHERE adopted = true ORDER BY kind, sort, statement')
  res.json(rows)
}))

app.get('/api/energy/activities', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM compass_energy_activities ORDER BY occurred_on DESC, created_at DESC LIMIT 100')
  res.json(rows)
}))

app.post('/api/energy/activities', wrap(async (req, res) => {
  const { activity, context, mode, energy_before, energy_after, engagement, discomfort, wanted_to_continue, want_more_if_successful, notes } = req.body as Record<string, unknown>
  const score = (value: unknown) => Number(value)
  if (!String(activity ?? '').trim()) return res.status(400).json({ error: 'activity required' })
  if (![score(energy_before), score(energy_after), score(engagement)].every((n) => Number.isInteger(n) && n >= 1 && n <= 5)) {
    return res.status(400).json({ error: 'energy and engagement scores must be 1–5' })
  }
  const allowedModes = ['build', 'diagnose', 'teach', 'sell', 'maintain', 'manage', 'connect', 'learn', 'other']
  const allowedDiscomfort = ['none', 'drain', 'growth_edge', 'unclear']
  if (!allowedModes.includes(String(mode))) return res.status(400).json({ error: 'invalid mode' })
  if (!allowedDiscomfort.includes(String(discomfort))) return res.status(400).json({ error: 'invalid discomfort' })
  const { rows } = await pool.query(
    `INSERT INTO compass_energy_activities
      (activity, context, mode, energy_before, energy_after, engagement, discomfort, wanted_to_continue, want_more_if_successful, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [String(activity).trim(), String(context ?? 'personal').trim() || 'personal', mode, score(energy_before), score(energy_after), score(engagement), discomfort, wanted_to_continue ?? null, want_more_if_successful ?? null, String(notes ?? '').trim()],
  )
  res.json(rows[0])
}))

app.post('/api/energy', wrap(async (req, res) => {
  const { energy, gave_energy, drained_energy } = req.body as { energy: number; gave_energy?: string; drained_energy?: string }
  const { rows: recent } = await pool.query('SELECT energy FROM compass_energy WHERE for_date >= CURRENT_DATE - INTERVAL \'6 days\'')
  const lows = recent.filter((r) => r.energy && r.energy <= 2).length + (energy <= 2 ? 1 : 0)
  const overcommit = lows >= 3
  const flagNote = overcommit ? 'Energy has been low for several days — check your Boundaries; a job is just a job.' : ''
  const { rows } = await pool.query(
    `INSERT INTO compass_energy (for_date, energy, gave_energy, drained_energy, overcommit_flag, flag_note, flagged_by)
     VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, 'self')
     ON CONFLICT (for_date) DO UPDATE SET energy = $1, gave_energy = $2, drained_energy = $3, overcommit_flag = $4, flag_note = $5
     RETURNING *`,
    [energy, gave_energy ?? '', drained_energy ?? '', overcommit, flagNote],
  )
  res.json(rows[0])
}))

// ─── reflection ──────────────────────────────────────────────────────
app.post('/api/reflect', wrap(async (req, res) => {
  const { period } = req.body as { period: 'daily' | 'weekly' | 'monthly' | 'quarterly' }
  const ctx = await loadContext()
  const { start, end } = periodWindow(period)
  const work = await pullWork(start, end)
  const hasWork = work.sessions.length || work.activity.length || work.commits.length
  const workSummary = hasWork
    ? [
        `Sessions (${work.sessions.length}):`,
        ...work.sessions.map((s: any) => `- ${s.project ?? '—'}: ${s.summary}`),
        `\nActivity (${work.activity.length}):`,
        ...work.activity.slice(0, 40).map((a: any) => `- [${a.event_type}] ${a.title}`),
        `\nGit commits:`,
        ...work.commits.map((c: any) => `- ${c.project}: ${c.lines.length} commits (${c.lines.slice(0, 5).join('; ')}${c.lines.length > 5 ? '…' : ''})`),
        `\nDecisions logged: ${work.decisions.length}`,
      ].join('\n')
    : ''
  const user = [
    `Draft ${USER_NAME}'s ${period} reflection.`,
    hasWork
      ? `Here is their actual completed work this period:\n${workSummary}`
      : 'No completed-work log is available this period (cloud mode). Ask them to recall the period themselves via the prompts; base the dashboard and alignment on their stated values and any decisions logged, and keep scores tentative.',
    '',
    'Return JSON:',
    '{"summary": "<warm 2-4 sentence narrative; if no work data, frame it as a reflective opening, not invented facts>",',
    ' "dashboard": {"health": {"score": 1-5, "note": ""}, "work": {"score": 1-5, "note": ""}, "play": {"score": 1-5, "note": ""}, "love": {"score": 1-5, "note": ""}},',
    ' "alignment": [{"name": "<domain or pillar>", "kind": "domain|pillar", "score": 0-100, "why": ""}],',
    ' "prompts": [{"q": "<a Good Time Journal style question: what gave/drained energy>", "a": ""}]}',
    period === 'quarterly' ? 'This is a QUARTERLY reflection — also add a prompt asking whether any Life Principle should be re-adjusted (a quarterly ritual).' : '',
    'Score Health/Work/Play/Love honestly (conservatively if no evidence, and flag the gap). 3-5 alignment rows, 2-3 prompts.',
  ].filter(Boolean).join('\n')
  const out = await askJSON<any>({ ctx, user, deep: true, maxTokens: 1800 })
  res.json({ period, period_start: start, period_end: end, pulled_work: work, ...out })
}))

app.get('/api/reflections', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM compass_reflections ORDER BY period_end DESC, created_at DESC LIMIT 60')
  res.json(rows)
}))

app.post('/api/reflections', wrap(async (req, res) => {
  const b = req.body as any
  const { rows } = await pool.query(
    `INSERT INTO compass_reflections (period, period_start, period_end, pulled_work, dashboard, alignment, prompts, summary, energy)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.period, b.period_start ?? null, b.period_end ?? null, JSON.stringify(b.pulled_work ?? {}), JSON.stringify(b.dashboard ?? {}),
     JSON.stringify(b.alignment ?? []), JSON.stringify(b.prompts ?? []), b.summary ?? '', b.energy ?? null],
  )
  res.json(rows[0])
}))

app.patch('/api/reflections/:id', wrap(async (req, res) => {
  const allowed = ['summary', 'energy']
  const fields = Object.fromEntries(Object.entries(req.body as Record<string, unknown>).filter(([k]) => allowed.includes(k)))
  return patchRow('compass_reflections', String(req.params.id), fields, res)
}))

app.delete('/api/reflections/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM compass_reflections WHERE id = $1', [req.params.id])
  res.json({ ok: true })
}))

// ─── error handler ───────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err?.message ?? 'server error' })
})
