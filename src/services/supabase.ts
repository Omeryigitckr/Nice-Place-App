import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { devWarn } from '../utils/devLog';

const PLACEHOLDER_VALUES = new Set([
  'your_supabase_url_here',
  'your_supabase_anon_key_here',
]);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

let warnedMissingConfig = false;
let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return (
    supabaseUrl.length > 0 &&
    supabaseAnonKey.length > 0 &&
    !PLACEHOLDER_VALUES.has(supabaseUrl) &&
    !PLACEHOLDER_VALUES.has(supabaseAnonKey)
  );
}

export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseUrl || PLACEHOLDER_VALUES.has(supabaseUrl)) {
    return 'Supabase URL is missing. Add EXPO_PUBLIC_SUPABASE_URL to your .env file.';
  }

  if (!supabaseAnonKey || PLACEHOLDER_VALUES.has(supabaseAnonKey)) {
    return 'Supabase anon key is missing. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.';
  }

  return 'Supabase is not configured. Using offline mock data.';
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    if (!warnedMissingConfig) {
      devWarn('[Nice Place]', getSupabaseConfigError());
      warnedMissingConfig = true;
    }
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

/** @deprecated Use getSupabase() — returns null when not configured. */
export const supabase = {
  get client() {
    return getSupabase();
  },
};
