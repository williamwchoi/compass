export interface Domain { id: string; name: string; blurb: string; color: string; sort: number; active: boolean }
export interface Value { id: string; domain_id: string; statement: string; detail: string; sort: number }
export interface Pillar { id: string; number: number; name: string; intent: string; sort: number }
export interface Goal { id: string; pillar_id: string; horizon: 'quarter' | 'annual'; period_label: string; goal: string; status: 'open' | 'done' | 'dropped'; sort: number }
export interface Rule { id: string; domain_id: string | null; rule: string; rationale: string; active: boolean; sort: number }

export interface Inspiration { id: string; kind: 'video' | 'article' | 'quote'; url: string; title: string; note: string; sort: number; created_at: string }

export interface Strength {
  id: string
  rank: number
  name: string
  domain: string
  description: string
  fuels: string[]
  drains: string[]
  source: string
  assessed_on: string | null
  sort: number
}

export interface StrengthCheck { name: string; verdict: 'feeds' | 'fights' | 'neutral'; why: string }

export interface Decision {
  id: string
  question: string
  options: string[]
  recommendation: string
  reasoning: string
  heuristics_used: string[]
  values_invoked: string[]
  strengths_invoked?: StrengthCheck[]
  status: 'open' | 'decided'
  chosen: string
  next_action: string
  review_on: string | null
  decided_at: string | null
  created_at: string
  ruled_out_why?: string
}

export interface UsageSummary {
  feature: string
  event_name: string
  events: number
  active_days: number
  last_used_at: string
}

export interface Intention {
  id: string
  for_date: string
  top_focus: { item: string; serves: string }[]
  drop_list: string[]
  note: string
  source: string
}

export interface Energy {
  id: string
  for_date: string
  energy: number
  gave_energy: string
  drained_energy: string
  overcommit_flag: boolean
  flag_note: string
}

export type EnergyProfileKind = 'fuel' | 'drain' | 'pattern' | 'principle'
export interface EnergyProfileItem {
  id: string
  kind: EnergyProfileKind
  statement: string
  detail: string
  provenance: string
  source_url: string
  source_date: string | null
  adopted: boolean
  sort: number
}

export type EnergyMode = 'build' | 'diagnose' | 'teach' | 'sell' | 'maintain' | 'manage' | 'connect' | 'learn' | 'other'
export type EnergyDiscomfort = 'none' | 'drain' | 'growth_edge' | 'unclear'
export interface EnergyActivity {
  id: string
  occurred_on: string
  activity: string
  context: string
  mode: EnergyMode
  energy_before: number
  energy_after: number
  engagement: number
  discomfort: EnergyDiscomfort
  wanted_to_continue: boolean | null
  want_more_if_successful: boolean | null
  notes: string
  created_at: string
}

export interface DashCell { score: number; note: string }
export interface ReflectionDraft {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  period_start: string
  period_end: string
  pulled_work: { sessions: unknown[]; activity: unknown[]; commits: { project: string; lines: string[] }[]; decisions: unknown[] }
  summary: string
  dashboard: { health: DashCell; work: DashCell; play: DashCell; love: DashCell }
  alignment: { name: string; kind: string; score: number; why: string }[]
  prompts: { q: string; a: string }[]
}
export interface Reflection extends Omit<ReflectionDraft, 'pulled_work'> { id: string; created_at: string; energy: number | null; pulled_work: unknown }

export interface ExerciseSection { heading: string; items?: string[]; note?: string }
export interface CompletedExercise {
  id: string
  exercise_id: string
  title: string
  done_on: string | null
  source: string
  sections: ExerciseSection[]
  sort: number
  created_at: string
}
