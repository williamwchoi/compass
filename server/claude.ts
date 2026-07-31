import Anthropic from '@anthropic-ai/sdk'
import { USER_NAME } from './config.js'

// AI features are optional: without a key the rest of the app still works and
// the AI routes return a clear 503 instead of crashing (see requireAI in app.ts).
export const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY)

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing')
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
const MODEL_DEEP = process.env.ANTHROPIC_MODEL_DEEP ?? 'claude-opus-4-8'

export interface CompassContext {
  domains: { name: string; blurb: string; values: { statement: string; detail: string }[] }[]
  pillars: { number: number; name: string; intent: string; goals: { horizon: string; goal: string; status: string }[] }[]
  rules: { rule: string; rationale: string }[]
}

function compassBlock(ctx: CompassContext): string {
  const values = ctx.domains
    .map((d) => `### ${d.name} — ${d.blurb}\n` + d.values.map((v) => `- ${v.statement}: ${v.detail}`).join('\n'))
    .join('\n\n')
  const pillars = ctx.pillars
    .map((p) => `${p.number}. ${p.name} — ${p.intent}` + (p.goals.length ? '\n' + p.goals.map((g) => `   • [${g.status}] (${g.horizon}) ${g.goal}`).join('\n') : ''))
    .join('\n')
  const rules = ctx.rules.length ? ctx.rules.map((r) => `- ${r.rule}${r.rationale ? ` (${r.rationale})` : ''}`).join('\n') : '(none set yet)'
  return [
    `You are Compass — a grounding companion for ${USER_NAME}.`,
    `Your job is to keep ${USER_NAME} aligned with their own values and to REDUCE their decision fatigue and burnout.`,
    'Speak plainly, warmly, and concretely. Reference their actual values, pillars, and pre-decided rules by name. Never give generic life-coach platitudes.',
    `\n## ${USER_NAME}'s Life Compass (values by domain)\n` + values,
    '\n## The Pillars of Growth (long-term goals)\n' + pillars,
    '\n## Pre-decided rules / defaults (the user\'s own heuristics)\n' + rules,
  ].join('\n')
}

interface CallOpts {
  ctx: CompassContext
  user: string
  deep?: boolean
  maxTokens?: number
}

/** Single JSON-returning call grounded in the compass. Parses the first JSON object/array. */
export async function askJSON<T>(opts: CallOpts): Promise<T> {
  const system = compassBlock(opts.ctx) + '\n\nRespond with ONLY valid JSON. No prose, no markdown fences.'
  const res = await client().messages.create({
    model: opts.deep ? MODEL_DEEP : MODEL,
    max_tokens: opts.maxTokens ?? 1500,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] as any,
    messages: [{ role: 'user', content: opts.user }],
  })
  const text = res.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim()
  return parseJSON<T>(text)
}

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.search(/[[{]/)
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T
    throw new Error('Claude did not return parseable JSON: ' + text.slice(0, 200))
  }
}
