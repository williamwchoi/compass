/**
 * EXAMPLE SEED DATA — committed. This is the template that ships with the app.
 *
 * Compass has no built-in content: it is a frame for YOUR values, goals, and
 * reflections. To make it your own:
 *
 *   1. cp scripts/seed-data.example.ts scripts/seed-data.ts
 *   2. Edit scripts/seed-data.ts — replace the samples below with your own.
 *   3. npm run db:seed
 *
 * scripts/seed-data.ts is gitignored, so your personal content never leaves your
 * machine or enters version control (same discipline as .env / .env.example).
 *
 * Every array can be empty ([]) — seed only what you want to start with and add
 * the rest inside the app.
 */

export type DomainSeed = {
  name: string
  blurb: string
  color: string
  values: { statement: string; detail?: string }[]
}

export type PillarSeed = {
  number: number
  name: string
  intent: string
  goals: { horizon: 'quarter' | 'annual'; period_label: string; goal: string }[]
}

export type ExerciseSeed = {
  exercise_id: string
  title: string
  done_on: string
  source: string
  sort: number
  sections: { heading: string; items?: string[]; note?: string }[]
}

export type StrengthSeed = {
  rank: number
  name: string
  domain: string
  description: string
  fuels: string[]
  drains: string[]
  assessed_on: string
}

export type EnergyProfileSeed = {
  kind: 'fuel' | 'drain' | 'pattern' | 'principle'
  statement: string
  detail: string
  provenance: string
  source_url: string
  source_date: string
  sort: number
}

// Life domains and the values under each. Sample shows two domains; add your own.
export const DOMAINS: DomainSeed[] = [
  {
    name: 'Career',
    blurb: 'How I relate to work.',
    color: '#b5838d',
    values: [
      { statement: 'Do work that compounds', detail: 'Prefer skills and projects whose value grows over time.' },
      { statement: 'Protect my time', detail: 'Draw my own boundaries; a job is an economic relationship, not my identity.' },
    ],
  },
  {
    name: 'Health',
    blurb: 'How I care for my body and mind.',
    color: '#6a9fb5',
    values: [
      { statement: 'Sustainable habits', detail: 'Small routines that compound beat heroic bursts.' },
    ],
  },
]

// Your pillars of growth, each with a few goals. Sample shows one pillar.
export const PILLARS: PillarSeed[] = [
  { number: 1, name: 'Grow professionally', intent: 'Build toward the work I want.', goals: [
    { horizon: 'quarter', period_label: 'this quarter', goal: 'Ship one project I am proud of' },
    { horizon: 'annual', period_label: 'this year', goal: 'Develop one new marketable skill' },
  ]},
]

// Completed self-discovery exercises (their actual outputs). Empty by default.
export const EXERCISES: ExerciseSeed[] = []

// Measured strengths (e.g. CliftonStrengths top 5). Empty by default.
export const STRENGTHS: StrengthSeed[] = []

// Stable hypotheses about what fuels or drains your energy. Empty by default.
export const ENERGY_PROFILE: EnergyProfileSeed[] = []
