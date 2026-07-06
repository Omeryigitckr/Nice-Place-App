import { DbProfile } from '../types/database';

import { CACHE_KEYS, CACHE_TTL } from './cacheKeys';
import { getCache, setCacheAsync } from './cacheStorage';

export async function readUserProfileCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<DbProfile | null> {
  if (!profileId) {
    return null;
  }
  return getCache<DbProfile>(CACHE_KEYS.userProfile(profileId), options);
}

export async function readUserProfileByAuthCache(
  authUserId: string,
  options?: { allowExpired?: boolean },
): Promise<DbProfile | null> {
  if (!authUserId) {
    return null;
  }
  return getCache<DbProfile>(CACHE_KEYS.userProfileByAuth(authUserId), options);
}

export function writeUserProfileCache(profile: DbProfile): void {
  if (!profile?.id) {
    return;
  }
  setCacheAsync(CACHE_KEYS.userProfile(profile.id), profile, CACHE_TTL.userProfileMs);
  if (profile.auth_user_id) {
    setCacheAsync(
      CACHE_KEYS.userProfileByAuth(profile.auth_user_id),
      profile,
      CACHE_TTL.userProfileMs,
    );
  }
}

export async function readSavedIdsCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<string[] | null> {
  if (!profileId) {
    return null;
  }
  return getCache<string[]>(CACHE_KEYS.savedIds(profileId), options);
}

export function writeSavedIdsCache(profileId: string, ids: string[]): void {
  if (!profileId) {
    return;
  }
  setCacheAsync(CACHE_KEYS.savedIds(profileId), ids, CACHE_TTL.engagementIdsMs);
}

export async function readLikedIdsCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<string[] | null> {
  if (!profileId) {
    return null;
  }
  return getCache<string[]>(CACHE_KEYS.likedIds(profileId), options);
}

export function writeLikedIdsCache(profileId: string, ids: string[]): void {
  if (!profileId) {
    return;
  }
  setCacheAsync(CACHE_KEYS.likedIds(profileId), ids, CACHE_TTL.engagementIdsMs);
}
