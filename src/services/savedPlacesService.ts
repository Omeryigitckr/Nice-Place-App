import {
  dedupeRequest,
  readSavedIdsCache,
  readSavedPlacesCache,
  writeSavedIdsCache,
  writeSavedPlacesCache,
} from '../cache';
import { markNetworkFailure, markNetworkSuccess } from '../network';
import { DbPlace } from '../types/database';
import { Place } from '../types/place';
import { devLog, devWarn } from '../utils/devLog';
import { isOfflineOrNetworkError } from '../utils/networkErrors';

import { enrichPlacesWithEngagement } from './placeEngagementService';
import { mapDbRowsToPlaces, PLACE_SELECT } from './placesService';
import { getSupabase } from './supabase';

export interface SavedPlaceResult {
  success: boolean;
  saved?: boolean;
  saveCount?: number;
  error?: string;
  requiresAuth?: boolean;
}

function clampCount(value: number): number {
  return Math.max(0, value);
}

export async function getSavedPlaceIds(profileId: string): Promise<string[]> {
  if (!profileId) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await readSavedIdsCache(profileId, { allowExpired: true })) ?? [];
  }

  try {
    const ids = await dedupeRequest(`saved:ids:${profileId}`, async () => {
      const { data, error } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        devWarn('[Nice Place Saves] error', error.message);
        return null;
      }

      const nextIds = (data ?? []).map((row) => row.place_id as string);
      writeSavedIdsCache(profileId, nextIds);
      devLog('[Nice Place Saves] loaded', nextIds.length);
      return nextIds;
    });

    if (ids !== null) {
      markNetworkSuccess();
      return ids;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place Saves] request failed:', error);
  }

  const cached = (await readSavedIdsCache(profileId, { allowExpired: true })) ?? [];
  if (cached.length > 0) {
    markNetworkFailure();
  }
  return cached;
}

export async function getPlaceSaveCount(placeId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !placeId) {
    return 0;
  }

  const { count, error } = await supabase
    .from('saved_places')
    .select('id', { count: 'exact', head: true })
    .eq('place_id', placeId);

  if (error) {
    devWarn('[Nice Place Saves] error', error.message);
    return 0;
  }

  return clampCount(count ?? 0);
}

export async function getSavedPlaces(
  profileId: string,
  viewerProfileId?: string | null,
): Promise<Place[]> {
  if (!profileId) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await readSavedPlacesCache(profileId, { allowExpired: true })) ?? [];
  }

  try {
    const places = await dedupeRequest(
      `saved:places:${profileId}:${viewerProfileId ?? profileId}`,
      async () => {
        const ids = await getSavedPlaceIds(profileId);
        if (ids.length === 0) {
          writeSavedPlacesCache(profileId, []);
          return [] as Place[];
        }

        const { data, error } = await supabase
          .from('places')
          .select(PLACE_SELECT)
          .in('id', ids)
          .eq('status', 'approved');

        if (error) {
          devWarn('[Nice Place Saves] error', error.message);
          return null;
        }

        const rows = (data ?? []) as DbPlace[];
        const mapped = await mapDbRowsToPlaces(rows);
        const enriched = await enrichPlacesWithEngagement(
          mapped,
          viewerProfileId === undefined ? profileId : viewerProfileId,
        );

        const order = new Map(ids.map((id, index) => [id, index]));
        const sorted = enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        writeSavedPlacesCache(profileId, sorted);
        return sorted;
      },
    );

    if (places !== null) {
      markNetworkSuccess();
      return places;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place Saves] places request failed:', error);
  }

  const cached = (await readSavedPlacesCache(profileId, { allowExpired: true })) ?? [];
  if (cached.length > 0) {
    markNetworkFailure();
  }
  return cached;
}

export async function savePlace(
  profileId: string,
  placeId: string,
  currentCount: number,
): Promise<SavedPlaceResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!profileId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Sign in to save places.',
    };
  }

  const { error } = await supabase.from('saved_places').insert({
    user_id: profileId,
    place_id: placeId,
  });

  if (error) {
    if (error.code === '23505') {
      const saveCount = await getPlaceSaveCount(placeId);
      devLog('[Nice Place Saves] saved', placeId);
      return { success: true, saved: true, saveCount };
    }
    devWarn('[Nice Place Saves] error', error.message);
    if (isOfflineOrNetworkError(error.message)) {
      markNetworkFailure();
    }
    return { success: false, error: error.message };
  }

  const saveCount = clampCount(currentCount + 1);
  devLog('[Nice Place Saves] saved', placeId);
  return { success: true, saved: true, saveCount };
}

export async function unsavePlace(
  profileId: string,
  placeId: string,
  currentCount: number,
): Promise<SavedPlaceResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!profileId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Sign in to save places.',
    };
  }

  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('user_id', profileId)
    .eq('place_id', placeId);

  if (error) {
    devWarn('[Nice Place Saves] error', error.message);
    if (isOfflineOrNetworkError(error.message)) {
      markNetworkFailure();
    }
    return { success: false, error: error.message };
  }

  const saveCount = clampCount(currentCount - 1);
  devLog('[Nice Place Saves] unsaved', placeId);
  return { success: true, saved: false, saveCount };
}

export async function toggleSavedPlace(
  profileId: string,
  placeId: string,
  currentlySaved: boolean,
  currentCount: number,
): Promise<SavedPlaceResult> {
  if (currentlySaved) {
    return unsavePlace(profileId, placeId, currentCount);
  }
  return savePlace(profileId, placeId, currentCount);
}
