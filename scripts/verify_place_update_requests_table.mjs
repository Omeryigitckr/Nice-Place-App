#!/usr/bin/env node
/**
 * Verify place_update_requests exists in Supabase PostgREST schema.
 * Usage: node scripts/verify_place_update_requests_table.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const raw = readFileSync(envPath, 'utf8');
  const env = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }

  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const { error } = await supabase.from('place_update_requests').select('id').limit(1);

if (!error) {
  console.log('OK: public.place_update_requests is visible to PostgREST.');
  process.exit(0);
}

console.error('FAIL:', error.code ?? 'unknown', error.message);
process.exit(1);
