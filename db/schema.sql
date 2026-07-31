-- Compass schema (lives in the local `command_center` Postgres DB,
-- so reflections can read cc_sessions / cc_activity directly).
-- Idempotent: safe to re-run.

-- ─── Compass: domains & values (from Life Principles) ────────────────
create table if not exists compass_domains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blurb text default '',
  color text default '#7c9a76',
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists compass_values (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references compass_domains(id) on delete cascade,
  statement text not null,
  detail text default '',
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Goals: the 9 Pillars of Growth + goals under them ───────────────
create table if not exists compass_pillars (
  id uuid primary key default gen_random_uuid(),
  number int not null,
  name text not null,
  intent text default '',
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists compass_goals (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references compass_pillars(id) on delete cascade,
  horizon text not null default 'quarter' check (horizon in ('quarter', 'annual')),
  period_label text default '',
  goal text not null,
  status text not null default 'open' check (status in ('open', 'done', 'dropped')),
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Rules: pre-decided defaults (fewer decisions) ───────────────────
create table if not exists compass_rules (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references compass_domains(id) on delete set null,
  rule text not null,
  rationale text default '',
  active boolean default true,
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Daily focus / intentions (Quadrant II) ──────────────────────────
create table if not exists compass_intentions (
  id uuid primary key default gen_random_uuid(),
  for_date date not null unique,
  top_focus jsonb default '[]',   -- [{item, serves}] (value/pillar it serves)
  drop_list jsonb default '[]',   -- ["explicit permission to drop ..."]
  note text default '',
  source text default 'claude',   -- claude | manual
  created_at timestamptz default now()
);

-- ─── Decision filter log ─────────────────────────────────────────────
create table if not exists compass_decisions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb default '[]',
  recommendation text default '',
  reasoning text default '',
  heuristics_used jsonb default '[]',  -- ["Quadrant II", "Boundaries", ...]
  values_invoked jsonb default '[]',
  status text not null default 'open' check (status in ('open', 'decided')),
  chosen text default '',
  next_action text default '',
  review_on date,
  decided_at timestamptz,
  created_at timestamptz default now()
);

alter table compass_decisions add column if not exists next_action text default '';
alter table compass_decisions add column if not exists review_on date;

-- ─── Reflections (daily / weekly / monthly / quarterly) ──────────────
create table if not exists compass_reflections (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('daily', 'weekly', 'monthly', 'quarterly')),
  period_start date,
  period_end date,
  pulled_work jsonb default '{}',   -- snapshot of cc_sessions / cc_activity / git
  dashboard jsonb default '{}',     -- {health:{score,note}, work, play, love}
  alignment jsonb default '[]',     -- [{name, kind, score, why}]
  prompts jsonb default '[]',       -- [{q, a}]
  summary text default '',
  energy int,
  created_at timestamptz default now()
);

-- ─── Inspiration (videos & articles to revisit when unmotivated) ─────
create table if not exists compass_inspirations (
  id uuid primary key default gen_random_uuid(),
  kind text default 'video',    -- video | article
  url text not null,
  title text default '',
  note text default '',         -- why this inspires me
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Energy / Good Time Journal (burnout signals) ────────────────────
create table if not exists compass_energy (
  id uuid primary key default gen_random_uuid(),
  for_date date not null unique,
  energy int check (energy between 1 and 5),
  gave_energy text default '',
  drained_energy text default '',
  overcommit_flag boolean default false,
  flag_note text default '',
  flagged_by text default 'self',   -- self | claude
  created_at timestamptz default now()
);

-- Stable hypotheses about what tends to fuel or drain the user. These are
-- separate from daily observations so a baseline can exist without being
-- mistaken for fresh behavioral evidence.
create table if not exists compass_energy_profile (
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
);

-- Activity-level Good Time Journal. Multiple entries per day are intentional:
-- a single day can contain an energizing build and draining maintenance.
create table if not exists compass_energy_activities (
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
);

-- Minimal, private product telemetry. Never store journal or decision content
-- here; events only describe which feature/action was used.
create table if not exists compass_usage_events (
  id uuid primary key default gen_random_uuid(),
  session_id text default '',
  event_name text not null,
  feature text not null,
  route text default '',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── Strengths (CliftonStrengths — measured wiring, vs chosen values) ─
create table if not exists compass_strengths (
  id uuid primary key default gen_random_uuid(),
  rank int not null,
  name text not null unique,
  domain text not null default '',        -- Executing | Strategic Thinking | Influencing | Relationship Building
  description text default '',
  fuels jsonb default '[]',               -- ["what this talent feeds on", ...]
  drains jsonb default '[]',              -- ["what starves or misfires it", ...]
  source text default 'CliftonStrengths',
  assessed_on date,
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Decisions can record how options feed or fight the wiring.
alter table compass_decisions add column if not exists strengths_invoked jsonb default '[]';

-- ─── Indexes ─────────────────────────────────────────────────────────
create index if not exists compass_values_domain on compass_values(domain_id, sort);
create index if not exists compass_goals_pillar on compass_goals(pillar_id, status);
create index if not exists compass_decisions_recent on compass_decisions(created_at desc);
create index if not exists compass_reflections_recent on compass_reflections(period, period_end desc);
create index if not exists compass_energy_date on compass_energy(for_date desc);
create index if not exists compass_energy_activity_date on compass_energy_activities(occurred_on desc, created_at desc);
create index if not exists compass_usage_events_recent on compass_usage_events(created_at desc, feature);

-- ─── Auto-update updated_at trigger ──────────────────────────────────
create or replace function compass_touch_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['compass_domains','compass_values','compass_pillars','compass_goals','compass_rules','compass_inspirations','compass_energy_profile','compass_energy_activities','compass_strengths']
  loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function compass_touch_updated_at()', t, t);
  end loop;
end $$;
