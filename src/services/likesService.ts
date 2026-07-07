import { dedupeRequest, readLikedIdsCache, writeLikedIdsCache } from '../cache';
import { markNetworkFailure, markNetworkSuccess } from '../network';
import { devLog, devWarn } from '../utils/devLog';
import { isOfflineOrNetworkError } from '../utils/networkErrors';

import { getSupabase } from './supabase';

export interface LikeResult {
  success: boolean;
  liked?: boolean;
  likeCount?: number;
  error?: string;
  requiresAuth?: boolean;
}

async function getProfileCreatedByKeys(profileId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return profileId ? [profileId] : [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, auth_user_id')
    .eq('id', profileId)
    .maybeSingle();

  if (error || !data) {
    return [profileId];
  }

  const keys = [data.id as string];
  const authUserId = data.auth_user_id as string | null;
  if (authUserId && authUserId !== data.id) {
    keys.push(authUserId);
  }
  return keys;
}

function clampCount(value: number): number {
  return Math.max(0, value);
}

async function fetchPlaceLikeCountFromDb(placeId: string): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase || !placeId) {
    return null;
  }

  const { data, error } = await supabase
    .from('places')
    .select('like_count')
    .eq('id', placeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return clampCount((data.like_count as number | null) ?? 0);
}

/** Place IDs the profile has liked. */
export async function getLikedPlaceIds(profileId: string): Promise<string[]> {
  if (!profileId) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await readLikedIdsCache(profileId, { allowExpired: true })) ?? [];
  }

  try {
    const ids = await dedupeRequest(`liked:ids:${profileId}`, async () => {
      const { data, error } = await supabase
        .from('place_likes')
        .select('place_id')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        devWarn('[Nice Place Likes] error', error.message);
        return null;
      }

      const nextIds = (data ?? []).map((row) => row.place_id as string);
      writeLikedIdsCache(profileId, nextIds);
      devLog('[Nice Place Likes] loaded', nextIds.length);
      return nextIds;
    });

    if (ids !== null) {
      markNetworkSuccess();
      return ids;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place Likes] request failed:', error);
  }

  const cached = (await readLikedIdsCache(profileId, { allowExpired: true })) ?? [];
  if (cached.length > 0) {
    markNetworkFailure();
  }
  return cached;
}

/** Live like count for a place (from place_likes). */
export async function getPlaceLikeCount(placeId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !placeId) {
    return 0;
  }

  const { count, error } = await supabase
    .from('place_likes')
    .select('id', { count: 'exact', head: true })
    .eq('place_id', placeId);

  if (error) {
    devWarn('[Nice Place Likes] error', error.message);
    return 0;
  }

  return clampCount(count ?? 0);
}

/**
 * Total likes received across all places created by this profile.
 * Uses the viewed profile id (not only the signed-in user).
 */
export async function getLikesReceivedForProfile(profileId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return 0;
  }

  try {
    const createdByKeys = await getProfileCreatedByKeys(profileId);

    const { data: places, error: placesError } = await supabase
      .from('places')
      .select('id')
      .in('created_by', createdByKeys);

    if (placesError) {
      devWarn('[Nice Place Likes] error', placesError.message);
      return 0;
    }

    const placeIds = (places ?? []).map((row) => row.id as string);
    if (placeIds.length === 0) {
      devLog('[Nice Place Likes] profile stats loaded', profileId, 0);
      return 0;
    }

    const { count, error } = await supabase
      .from('place_likes')
      .select('id', { count: 'exact', head: true })
      .in('place_id', placeIds);

    if (error) {
      devWarn('[Nice Place Likes] error', error.message);
      return 0;
    }

    const likesReceived = clampCount(count ?? 0);
    devLog('[Nice Place Likes] profile stats loaded', profileId, likesReceived);
    return likesReceived;
  } catch (error: unknown) {
    devWarn('[Nice Place Likes] likes received request failed:', error);
    return 0;
  }
}

export async function likePlace(
  profileId: string,
  placeId: string,
  currentCount: number,
): Promise<LikeResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!profileId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Sign in to like places.',
    };
  }

  const { error } = await supabase.from('place_likes').insert({
    user_id: profileId,
    place_id: placeId,
  });

  if (error) {
    if (error.code === '23505') {
      const likeCount = (await fetchPlaceLikeCountFromDb(placeId)) ?? (await getPlaceLikeCount(placeId));
      devLog('[Nice Place Likes] liked', placeId);
      return { success: true, liked: true, likeCount };
    }
    devWarn('[Nice Place Likes] error', error.message);
    if (isOfflineOrNetworkError(error.message)) {
      markNetworkFailure();
    }
    return { success: false, error: error.message };
  }

  const likeCount =
    (await fetchPlaceLikeCountFromDb(placeId)) ?? clampCount(currentCount + 1);
  devLog('[Nice Place Likes] liked', placeId);
  return { success: true, liked: true, likeCount };
}

export async function unlikePlace(
  profileId: string,
  placeId: string,
  currentCount: number,
): Promise<LikeResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!profileId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Sign in to like places.',
    };
  }

  const { error } = await supabase
    .from('place_likes')
    .delete()
    .eq('user_id', profileId)
    .eq('place_id', placeId);

  if (error) {
    devWarn('[Nice Place Likes] error', error.message);
    if (isOfflineOrNetworkError(error.message)) {
      markNetworkFailure();
    }
    return { success: false, error: error.message };
  }

  const likeCount =
    (await fetchPlaceLikeCountFromDb(placeId)) ?? clampCount(currentCount - 1);
  devLog('[Nice Place Likes] unliked', placeId);
  return { success: true, liked: false, likeCount };
}

export async function togglePlaceLike(
  profileId: string,
  placeId: string,
  currentlyLiked: boolean,
  currentCount: number,
): Promise<LikeResult> {
  if (currentlyLiked) {
    return unlikePlace(profileId, placeId, currentCount);
  }
  return likePlace(profileId, placeId, currentCount);
}
