import { Place } from '../types/place';
import { devLog, devWarn } from '../utils/devLog';

import { fetchProfileIdByAuthUserId } from './authService';
import { getSupabase } from './supabase';

export interface PlaceEngagement {
  likeCount: number;
  saveCount: number;
  isLikedByCurrentUser: boolean;
  isSavedByCurrentUser: boolean;
}

function clampCount(value: number): number {
  return Math.max(0, value);
}

function emptyEngagement(): PlaceEngagement {
  return {
    likeCount: 0,
    saveCount: 0,
    isLikedByCurrentUser: false,
    isSavedByCurrentUser: false,
  };
}

/** Session-scoped viewer id cache — avoids profile lookup on every place list load. */
let cachedViewerProfileId: string | null | undefined;

export function clearViewerProfileIdCache(): void {
  cachedViewerProfileId = undefined;
}

/**
 * Load real like/save counts from place_likes and saved_places.
 * Optionally marks whether the viewer has liked/saved each place.
 */
export async function getPlaceEngagementForPlaces(
  placeIds: string[],
  viewerProfileId?: string | null,
): Promise<Record<string, PlaceEngagement>> {
  const supabase = getSupabase();
  const uniqueIds = [...new Set(placeIds.filter(Boolean))];
  const result: Record<string, PlaceEngagement> = {};

  for (const id of uniqueIds) {
    result[id] = emptyEngagement();
  }

  if (!supabase || uniqueIds.length === 0) {
    return result;
  }

  try {
    // Guests: only place_id (counts). Signed-in: include user_id for flags.
    const [likesResult, savesResult] = viewerProfileId
      ? await Promise.all([
          supabase
            .from('place_likes')
            .select('place_id, user_id')
            .in('place_id', uniqueIds),
          supabase
            .from('saved_places')
            .select('place_id, user_id')
            .in('place_id', uniqueIds),
        ])
      : await Promise.all([
          supabase.from('place_likes').select('place_id').in('place_id', uniqueIds),
          supabase.from('saved_places').select('place_id').in('place_id', uniqueIds),
        ]);

    if (likesResult.error) {
      devWarn('[Nice Place] place likes count error', likesResult.error.message);
    } else {
      for (const row of likesResult.data ?? []) {
        const placeId = row.place_id as string;
        const entry = result[placeId] ?? emptyEngagement();
        entry.likeCount += 1;
        if (
          viewerProfileId &&
          'user_id' in row &&
          (row as { user_id?: string }).user_id === viewerProfileId
        ) {
          entry.isLikedByCurrentUser = true;
        }
        result[placeId] = entry;
      }
    }

    if (savesResult.error) {
      devWarn('[Nice Place] place saves count error', savesResult.error.message);
    } else {
      for (const row of savesResult.data ?? []) {
        const placeId = row.place_id as string;
        const entry = result[placeId] ?? emptyEngagement();
        entry.saveCount += 1;
        if (
          viewerProfileId &&
          'user_id' in row &&
          (row as { user_id?: string }).user_id === viewerProfileId
        ) {
          entry.isSavedByCurrentUser = true;
        }
        result[placeId] = entry;
      }
    }
  } catch (error: unknown) {
    devWarn('[Nice Place] engagement request failed:', error);
    return result;
  }

  for (const id of uniqueIds) {
    result[id] = {
      ...result[id],
      likeCount: clampCount(result[id].likeCount),
      saveCount: clampCount(result[id].saveCount),
    };
  }

  devLog('[Nice Place] place card counts loaded', uniqueIds.length, 'places');

  return result;
}

async function getOptionalViewerProfileId(): Promise<string | null> {
  if (cachedViewerProfileId !== undefined) {
    return cachedViewerProfileId;
  }

  const supabase = getSupabase();
  if (!supabase) {
    cachedViewerProfileId = null;
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const authUserId = data.session?.user?.id;
    if (!authUserId) {
      cachedViewerProfileId = null;
      return null;
    }

    const { profileId } = await fetchProfileIdByAuthUserId(authUserId);
    cachedViewerProfileId = profileId;
    return profileId;
  } catch (error: unknown) {
    devWarn('[Nice Place] viewer profile lookup failed:', error);
    cachedViewerProfileId = null;
    return null;
  }
}

/** Attach live engagement counts to place objects. */
export async function enrichPlacesWithEngagement<T extends Place>(
  places: T[],
  viewerProfileId?: string | null,
): Promise<T[]> {
  if (places.length === 0) {
    return places;
  }

  try {
    const viewerId =
      viewerProfileId === undefined ? await getOptionalViewerProfileId() : viewerProfileId;

    const engagement = await getPlaceEngagementForPlaces(
      places.map((place) => place.id),
      viewerId,
    );

    return places.map((place) => {
      const stats = engagement[place.id] ?? emptyEngagement();
      return {
        ...place,
        likeCount: stats.likeCount,
        saveCount: stats.saveCount,
        isLikedByCurrentUser: stats.isLikedByCurrentUser,
        isSavedByCurrentUser: stats.isSavedByCurrentUser,
      };
    });
  } catch (error: unknown) {
    devWarn('[Nice Place] enrich engagement failed:', error);
    return places;
  }
}
