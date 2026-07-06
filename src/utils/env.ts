import { getSupabaseConfigError, isSupabaseConfigured } from '../services/supabase';

import { devWarn } from './devLog';
import { getMapboxConfigError, getMapboxToken } from './mapbox';

export interface EnvStatus {
  supabaseConfigured: boolean;
  mapboxConfigured: boolean;
  errors: string[];
}

/**
 * Non-throwing env validation for release-safe startup.
 * Missing values surface as messages — never crash the app.
 */
export function getEnvStatus(): EnvStatus {
  const errors: string[] = [];

  const supabaseConfigured = isSupabaseConfigured();
  const supabaseError = getSupabaseConfigError();
  if (!supabaseConfigured && supabaseError) {
    errors.push(supabaseError);
  }

  const mapboxConfigured = getMapboxToken() != null;
  const mapboxError = getMapboxConfigError();
  if (!mapboxConfigured && mapboxError) {
    errors.push(mapboxError);
  }

  return { supabaseConfigured, mapboxConfigured, errors };
}

/** Log missing env once in development. Safe to call at startup. */
export function warnMissingEnvOnce(): void {
  const status = getEnvStatus();
  if (status.errors.length === 0) {
    return;
  }
  for (const message of status.errors) {
    devWarn('[Nice Place Env]', message);
  }
}
