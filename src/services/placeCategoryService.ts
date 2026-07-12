import {
  MAX_PLACE_CATEGORIES,
  MIN_PLACE_CATEGORIES,
  normalizePlaceCategories,
  PlaceCategoryKey,
} from '../constants/placeCategories';
import { DbPlaceCategory } from '../types/database';
import { devError, devWarn } from '../utils/devLog';

import { getSupabase } from './supabase';

export interface SyncPlaceCategoriesInput {
  placeId: string;
  categoryKeys: string[];
}

export interface SyncPlaceCategoriesResult {
  success: boolean;
  error?: string;
}

export interface InsertPlaceCategoriesResult {
  success: boolean;
  error?: string;
}

function isMissingSyncPlaceCategoriesRpc(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    message.includes('sync_place_categories') ||
    message.includes('could not find the function')
  );
}

/** Batch-load category keys keyed by place id (ordered by created_at). */
export async function fetchPlaceCategoriesByPlaceIds(
  placeIds: string[],
): Promise<Record<string, string[]>> {
  const supabase = getSupabase();
  if (!supabase || placeIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('place_categories')
    .select('place_id, category_key, created_at')
    .in('place_id', placeIds)
    .order('created_at', { ascending: true });

  if (error) {
    devWarn('[Nice Place] fetchPlaceCategoriesByPlaceIds failed:', error.message);
    return {};
  }

  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as Pick<DbPlaceCategory, 'place_id' | 'category_key'>[]) {
    if (!map[row.place_id]) {
      map[row.place_id] = [];
    }
    if (!map[row.place_id].includes(row.category_key)) {
      map[row.place_id].push(row.category_key);
    }
  }

  return map;
}

export async function fetchPlaceCategoryKeys(placeId: string): Promise<PlaceCategoryKey[]> {
  const map = await fetchPlaceCategoriesByPlaceIds([placeId]);
  const keys = map[placeId] ?? [];
  return normalizePlaceCategories(keys);
}

/** Insert category rows for a newly created place. */
export async function insertPlaceCategories(
  placeId: string,
  categoryKeys: string[],
): Promise<InsertPlaceCategoriesResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const normalized = normalizePlaceCategories(categoryKeys);
  if (normalized.length < MIN_PLACE_CATEGORIES || normalized.length > MAX_PLACE_CATEGORIES) {
    return {
      success: false,
      error: 'placeForm.validation.categoriesRange',
    };
  }

  const rows = normalized.map((categoryKey) => ({
    place_id: placeId,
    category_key: categoryKey,
  }));

  const { error } = await supabase.from('place_categories').insert(rows);

  if (error) {
    devError('[Nice Place] insertPlaceCategories failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** Replace all categories for a place (owner resubmit or admin approval). */
export async function syncPlaceCategories(
  input: SyncPlaceCategoriesInput,
): Promise<SyncPlaceCategoriesResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const normalized = normalizePlaceCategories(input.categoryKeys);
  if (normalized.length < MIN_PLACE_CATEGORIES || normalized.length > MAX_PLACE_CATEGORIES) {
    return {
      success: false,
      error: 'placeForm.validation.categoriesSetRange',
    };
  }

  const { error: rpcError } = await supabase.rpc('sync_place_categories', {
    p_place_id: input.placeId,
    p_category_keys: normalized,
  });

  if (!rpcError) {
    return { success: true };
  }

  if (!isMissingSyncPlaceCategoriesRpc(rpcError)) {
    devError('[Nice Place] syncPlaceCategories rpc failed:', rpcError.message);
    return { success: false, error: rpcError.message };
  }

  const { error: deleteError } = await supabase
    .from('place_categories')
    .delete()
    .eq('place_id', input.placeId);

  if (deleteError) {
    devError('[Nice Place] syncPlaceCategories delete failed:', deleteError.message);
    return { success: false, error: deleteError.message };
  }

  const insertResult = await insertPlaceCategories(input.placeId, normalized);
  if (!insertResult.success) {
    return insertResult;
  }

  const { error: legacyError } = await supabase
    .from('places')
    .update({ category: normalized[0] })
    .eq('id', input.placeId);

  if (legacyError) {
    devWarn('[Nice Place] syncPlaceCategories legacy category update failed:', legacyError.message);
  }

  return { success: true };
}
