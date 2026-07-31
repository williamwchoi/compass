import { Pool } from 'pg'

// Cloud (Vercel/Neon): use DATABASE_URL with SSL.
// Local: connect to the local `command_center` Postgres (no URL needed).
const url = process.env.DATABASE_URL
export const pool = url
  ? new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
  : new Pool({ database: process.env.PGDATABASE ?? 'command_center' })

// Opt-in integration with a local Command Center DB (cc_* tables + local git
// repos), which enriches reflections with completed work. Explicit flag, not
// inferred from the environment: most machines don't have those tables, and
// "no DATABASE_URL" is not evidence that they do.
export const HAS_COMMAND_CENTER = process.env.ENABLE_COMMAND_CENTER === 'true'
