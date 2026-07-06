#!/usr/bin/env bash
set -euo pipefail

# Apply admin UPDATE RLS for place_update_requests (approve/reject).
#
# Usage:
#   SUPABASE_DB_PASSWORD='your-db-password' ./scripts/apply_place_update_requests_admin_rls.sh
#
# Password: Supabase Dashboard → Project Settings → Database → Database password

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="ebyfsztmqdwmbvpmclvy"
SQL_FILE="$ROOT_DIR/scripts/2026_07_04_place_update_requests_admin_rls.sql"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Missing SUPABASE_DB_PASSWORD."
  echo "Set your Supabase database password and rerun:"
  echo "  SUPABASE_DB_PASSWORD='...' ./scripts/apply_place_update_requests_admin_rls.sh"
  exit 1
fi

DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "Applying $SQL_FILE ..."
npx --yes supabase db query --file "$SQL_FILE" --db-url "$DB_URL" --yes

echo "Verifying policies exist ..."
npx --yes supabase db query --db-url "$DB_URL" --yes \
  "select policyname, cmd from pg_policies where tablename = 'place_update_requests' order by policyname;"

echo "Done."
