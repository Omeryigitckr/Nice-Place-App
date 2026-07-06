import { CACHE_KEYS } from './cacheKeys';
import { removeCache } from './cacheStorage';
import { devWarn } from '../utils/devLog';

export interface ClearUserSessionIds {
  profileId?: string | null;
  authUserId?: string | null;
}

/**
 * Clears private user caches only.
 * Keeps public place list / map / place detail caches for faster guest browsing.
 */
export async function clearUserPrivateCache(ids: ClearUserSessionIds): Promise<void> {
  const keys: string[] = [];

  if (ids.profileId) {
    keys.push(
      CACHE_KEYS.userProfile(ids.profileId),
      CACHE_KEYS.savedPlaces(ids.profileId),
      CACHE_KEYS.savedIds(ids.profileId),
      CACHE_KEYS.likedIds(ids.profileId),
      CACHE_KEYS.myPlaces(ids.profileId),
    );
  }

  if (ids.authUserId) {
    keys.push(CACHE_KEYS.userProfileByAuth(ids.authUserId));
  }

  if (keys.length === 0) {
    return;
  }

  try {
    await Promise.all(keys.map((key) => removeCache(key)));
  } catch (error: unknown) {
    devWarn('[Nice Place Cache] clear user session failed:', error);
  }
}
