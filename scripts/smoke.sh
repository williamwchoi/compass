#!/usr/bin/env bash
# Smoke test: prove the app runs end-to-end from a completely empty database.
#   npm run smoke
# Creates a throwaway local Postgres DB, applies the schema, seeds it, boots the
# API on a spare port, hits the main endpoints, then tears everything down.
# Never touches your real database. Requires: local Postgres, psql/createdb.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=compass_smoke
PORT=4099
FAIL=0

cleanup() {
  [[ -n "${SRV:-}" ]] && kill "$SRV" 2>/dev/null || true
  sleep 0.3
  dropdb "$DB" 2>/dev/null || true
}
trap cleanup EXIT

echo "1/5 fresh database"
dropdb "$DB" 2>/dev/null || true
createdb "$DB"

echo "2/5 apply schema"
psql -q -d "$DB" -f db/schema.sql >/dev/null

echo "3/5 seed"
PGDATABASE="$DB" npx tsx scripts/seed.ts

echo "4/5 boot API on :$PORT"
PGDATABASE="$DB" PORT="$PORT" npx tsx server/index.ts >/tmp/compass_smoke.log 2>&1 &
SRV=$!

echo "5/5 hit endpoints"
curl -sf --retry 20 --retry-connrefused --retry-delay 1 --max-time 5 \
  "http://localhost:$PORT/api/health" >/dev/null || { echo "FAIL: /api/health"; exit 1; }

for ep in domains values pillars goals rules exercises strengths energy/profile; do
  n=$(curl -sf --max-time 5 "http://localhost:$PORT/api/$ep" | node -e \
    "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).length))") \
    || { echo "FAIL: /api/$ep"; FAIL=1; continue; }
  echo "  /api/$ep -> $n rows"
done

[[ "$FAIL" == 0 ]] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
