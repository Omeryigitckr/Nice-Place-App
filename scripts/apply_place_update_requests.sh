#!/usr/bin/env bash
set -euo pipefail

# Apply place_update_requests migration to remote Supabase Postgres.
#
# Usage:
#   SUPABASE_DB_PASSWORD='your-db-password' ./scripts/apply_place_update_requests.sh
#
# Find the database password in:
# Supabase Dashboard → Project Settings → Database → Database password

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="ebyfsztmqdwmbvpmclvy"
SQL_FILE="$ROOT_DIR/scripts/2026_07_03_place_update_requests_sync.sql"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Missing SUPABASE_DB_PASSWORD."
  echo "Set your Supabase database password and rerun:"
  echo "  SUPABASE_DB_PASSWORD='...' ./scripts/apply_place_update_requests.sh"
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required but not installed."
  exit 1
fi

DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "Applying migration from $SQL_FILE ..."
npx supabase db query --file "$SQL_FILE" --db-url "$DB_URL" --yes

echo "Verifying PostgREST visibility ..."
node "$ROOT_DIR/scripts/verify_place_update_requests_table.mjs"
