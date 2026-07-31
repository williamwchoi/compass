/**
 * Seed runner — inserts whatever lives in scripts/seed-data.ts into the
 * compass_* tables. Contains NO personal content itself: the data layer is
 * scripts/seed-data.ts (gitignored). First-time setup:
 *
 *   cp scripts/seed-data.example.ts scripts/seed-data.ts   # then edit it
 *   npm run db:seed
 *
 * Idempotent: skips if compass_domains already has rows unless run with --force.
 *   npm run db:seed -- --force
 */
import { Pool } from 'pg'

// Cloud (Neon): DATABASE_URL with SSL. Local: PGDATABASE (defaults to command_center).
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({ database: process.env.PGDATABASE ?? 'command_center' })
const force = process.argv.includes('--force')

async function loadSeedData() {
  try {
    return await import('./seed-data.js') as typeof import('./seed-data.js')
  } catch {
    console.error(
      '\nNo scripts/seed-data.ts found.\n' +
      'Create it from the template first:\n\n' +
      '  cp scripts/seed-data.example.ts scripts/seed-data.ts\n\n' +
      'then edit it with your own content and re-run `npm run db:seed`.\n',
    )
    process.exit(1)
  }
}

// Tables the seed writes into that are not (yet) in db/schema.sql. Safe to re-run.
async function ensureTables(client: import('pg').PoolClient) {
  await client.query(`create table if not exists compass_exercises (
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
  await client.query(`create table if not exists compass_strengths (
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
  await client.query(`create table if not exists compass_energy_profile (
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
}

async function main() {
  const { DOMAINS, PILLARS, EXERCISES, STRENGTHS, ENERGY_PROFILE } = await loadSeedData()

  const { rows } = await pool.query('select count(*)::int as n from compass_domains')
  if (rows[0].n > 0 && !force) {
    console.log(`compass_domains already has ${rows[0].n} rows. Use --force to re-seed. Skipping.`)
    await pool.end()
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await ensureTables(client)
    if (force) {
      await client.query('truncate compass_values, compass_domains, compass_goals, compass_pillars restart identity cascade')
    }

    for (let d = 0; d < DOMAINS.length; d++) {
      const dom = DOMAINS[d]
      const { rows: dr } = await client.query(
        'insert into compass_domains (name, blurb, color, sort) values ($1,$2,$3,$4) returning id',
        [dom.name, dom.blurb, dom.color, d],
      )
      const domainId = dr[0].id
      for (let v = 0; v < dom.values.length; v++) {
        const val = dom.values[v]
        await client.query(
          'insert into compass_values (domain_id, statement, detail, sort) values ($1,$2,$3,$4)',
          [domainId, val.statement, val.detail ?? '', v],
        )
      }
    }

    for (let p = 0; p < PILLARS.length; p++) {
      const pil = PILLARS[p]
      const { rows: pr } = await client.query(
        'insert into compass_pillars (number, name, intent, sort) values ($1,$2,$3,$4) returning id',
        [pil.number, pil.name, pil.intent, p],
      )
      const pillarId = pr[0].id
      for (let g = 0; g < pil.goals.length; g++) {
        const goal = pil.goals[g]
        await client.query(
          'insert into compass_goals (pillar_id, horizon, period_label, goal, sort) values ($1,$2,$3,$4,$5)',
          [pillarId, goal.horizon, goal.period_label, goal.goal, g],
        )
      }
    }

    // Exercises — idempotent on exercise_id so re-seeding won't duplicate.
    for (const ex of EXERCISES) {
      await client.query(
        `insert into compass_exercises (exercise_id, title, done_on, source, sections, sort)
         select $1, $2, $3, $4, $5::jsonb, $6
         where not exists (select 1 from compass_exercises where exercise_id = $1)`,
        [ex.exercise_id, ex.title, ex.done_on, ex.source, JSON.stringify(ex.sections), ex.sort],
      )
    }

    // Strengths — idempotent on name.
    for (const s of STRENGTHS) {
      await client.query(
        `insert into compass_strengths (rank, name, domain, description, fuels, drains, source, assessed_on, sort)
         values ($1,$2,$3,$4,$5,$6,'CliftonStrengths',$7,$1) on conflict (name) do nothing`,
        [s.rank, s.name, s.domain, s.description, JSON.stringify(s.fuels), JSON.stringify(s.drains), s.assessed_on],
      )
    }

    // Energy profile — idempotent on (kind, statement).
    for (const e of ENERGY_PROFILE) {
      await client.query(
        `insert into compass_energy_profile (kind, statement, detail, provenance, source_url, source_date, sort)
         values ($1,$2,$3,$4,$5,$6,$7) on conflict (kind, statement) do nothing`,
        [e.kind, e.statement, e.detail, e.provenance, e.source_url, e.source_date, e.sort],
      )
    }

    await client.query('COMMIT')
    const counts = await client.query(
      `select (select count(*) from compass_domains) domains, (select count(*) from compass_values) values,
              (select count(*) from compass_pillars) pillars, (select count(*) from compass_goals) goals,
              (select count(*) from compass_exercises) exercises, (select count(*) from compass_strengths) strengths`,
    )
    console.log('Seeded:', counts.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
