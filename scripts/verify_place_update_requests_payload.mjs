#!/usr/bin/env node
/**
 * Verify every app insert field exists on place_update_requests.
 * Must stay aligned with src/constants/placeUpdateRequestSchema.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const INSERT_FIELDS = [
  'place_id',
  'user_id',
  'title',
  'description',
  'category',
  'latitude',
  'longitude',
  'access_type',
  'best_time',
  'difficulty_level',
  'crowd_level',
  'is_pet_friendly',
  'is_child_friendly',
  'is_car_accessible',
  'is_camp_allowed',
  'is_picnic_suitable',
  'safety_note',
  'cover_photo_url',
  'status',
];

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
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const payload = {
  place_id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0000-000000000002',
  title: 'Test',
  description: 'Test',
  category: 'other',
  latitude: 41.0,
  longitude: 29.0,
  access_type: 'unknown',
  best_time: 'Anytime',
  difficulty_level: 'unknown',
  crowd_level: 'unknown',
  is_pet_friendly: false,
  is_child_friendly: false,
  is_car_accessible: false,
  is_camp_allowed: false,
  is_picnic_suitable: false,
  safety_note: null,
  cover_photo_url: null,
  status: 'pending',
};

const { error } = await supabase.from('place_update_requests').insert(payload);

if (!error) {
  console.error('UNEXPECTED: anon insert succeeded.');
  process.exit(1);
}

if (error.code === '42501') {
  console.log('OK: all insert fields exist. RLS blocked anon insert as expected.');
  console.log('Fields checked:', INSERT_FIELDS.join(', '));
  process.exit(0);
}

if (error.code === 'PGRST204') {
  console.error('FAIL: PGRST204 — payload field missing from table:', error.message);
  console.error('Run scripts/2026_07_03_place_update_requests_sync.sql in Supabase SQL Editor.');
  process.exit(1);
}

if (error.code === '23503' || error.code === '22P02') {
  console.log('OK: all insert fields exist (FK/type check failed as expected for dummy ids).');
  console.log('Fields checked:', INSERT_FIELDS.join(', '));
  process.exit(0);
}

console.error('FAIL:', error.code ?? 'unknown', error.message);
process.exit(1);
