import { getCurrentSession } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabase';
import { devWarn } from '../utils/devLog';

import { readMapPlacesCache } from './placesCache';
import {
  readLikedIdsCache,
  readSavedIdsCache,
  readUserProfileByAuthCache,
} from './userCache';

const PRELOAD_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/**
 * Warm AsyncStorage reads only — no network, no background sync.
 * Screens still do cache-first UI + Supabase refresh themselves.
 */
export async function preloadAppData(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    await withTimeout(runPreload(), PRELOAD_TIMEOUT_MS);
  } catch (error: unknown) {
    devWarn('[Nice Place Cache] preload failed:', error);
  }
}

async function runPreload(): Promise<void> {
  await readMapPlacesCache({ allowExpired: true });

  const session = await getCurrentSession();
  const authUserId = session?.user?.id ?? null;
  if (!authUserId) {
    return;
  }

  const profile = await readUserProfileByAuthCache(authUserId, { allowExpired: true });
  const profileId = profile?.id;
  if (!profileId) {
    return;
  }

  await Promise.all([
    readSavedIdsCache(profileId, { allowExpired: true }),
    readLikedIdsCache(profileId, { allowExpired: true }),
  ]);
}
