# Compass

A personal values & reflection dashboard — built to fight decision fatigue and burnout by keeping your daily work aligned with your own operating framework.

Compass ships **empty by design**: it's a frame you fill with your own life domains, values, pillars, goals, and completed self-discovery exercises. Nothing about anyone else's life is in the code.

## What it does

- **Check-in** — an AI-generated daily intention (1–3 important-not-urgent focuses + a guilt-free "OK to drop" list), a Good Time Journal energy check, and your open decisions.
- **Decide** — run any choice through your values, pre-decided rules, and measured strengths. Returns a recommendation, the reasoning, which of *your* rules fired, and permission to drop what doesn't serve your goals.
- **Reflect** — daily/weekly/monthly/quarterly reflection drafts scoring Health/Work/Play/Love and value alignment, with guided questions.
- **Foundations** — your values by life domain, pillars & goals, strengths, energy profile, and completed self-discovery exercises (Design Your Life, the Flower exercise, Nine Lives).
- **Inspiration** — videos, articles, and quotes to revisit when unmotivated.

## Stack

React 19 + Vite + Tailwind 4 + TanStack Query (frontend) · Express 5 + `pg` on Postgres (backend) · Claude via `@anthropic-ai/sdk` for the AI features.

## Setup

Prereqs: Node 20+, and a Postgres database — either installed locally or a free hosted one ([Neon](https://neon.tech), [Supabase](https://supabase.com)).

```bash
# 1. Install
npm install

# 2. Configure — fill in your values (see comments in the file)
cp .env.example .env

# 3. Create the tables
#    Local Postgres:            createdb compass && psql -d compass -f db/schema.sql
#    Hosted (Neon/Supabase):    psql "$DATABASE_URL" -f db/schema.sql

# 4. Add YOUR content (values, pillars, exercises) — this file stays on your
#    machine; it is gitignored and never committed
cp scripts/seed-data.example.ts scripts/seed-data.ts
#    ...edit scripts/seed-data.ts...
npm run db:seed

# 5. Run
npm run dev            # frontend on :4174, API on :4001
```

The AI features (daily intention, decision filter, reflection drafts) need an `ANTHROPIC_API_KEY` in `.env` — get one at [console.anthropic.com](https://console.anthropic.com). Calls are billed to your key.

## Verify

```bash
npm run smoke                   # boots the whole stack against a throwaway DB
node scripts/mobile-check.mjs   # 375px audit: no horizontal scroll, inputs >= 16px
```

## Deploying

The repo deploys to Vercel as a static frontend + serverless API (`vercel.json` is included). Set `DATABASE_URL`, `ANTHROPIC_API_KEY`, and `COMPASS_PASSWORD` in the Vercel project's environment variables. `COMPASS_PASSWORD` gates every API route on your public URL — this is a single-user app, so one shared password is the auth model.

## Privacy model

- **Code** (this repo) is shareable and contains no one's personal data.
- **Config** (`.env`) and **content** (`scripts/seed-data.ts`, your database) are yours and are gitignored.
- Each person runs their own instance against their own database — there is no shared storage and no multi-user mode.

## License

MIT — see [LICENSE](LICENSE).
