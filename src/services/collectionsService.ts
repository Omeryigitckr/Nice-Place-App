import {
  dedupeRequest,
  invalidateCollectionPlacesCache,
  invalidateCollectionsCache,
  invalidatePlaceCollectionsCache,
  readCollectionPlacesCache,
  readCollectionsListCache,
  readPlaceCollectionIdsCache,
  writeCollectionPlacesCache,
  writeCollectionsListCache,
  writePlaceCollectionIdsCache,
} from '../cache';
import { markNetworkFailure, markNetworkSuccess } from '../network';
import { SavedCollection } from '../types/collection';
import { DbPlace, DbSavedCollection } from '../types/database';
import { Place } from '../types/place';
import { devLog, devWarn } from '../utils/devLog';
import { isOfflineOrNetworkError } from '../utils/networkErrors';

import { enrichPlacesWithEngagement } from './placeEngagementService';
import { mapDbRowsToPlaces, PLACE_SELECT } from './placesService';
import { getSavedPlaceIds, savePlace } from './savedPlacesService';
import { getSupabase } from './supabase';

export const COLLECTION_NAME_MAX_LENGTH = 40;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 120;

export interface CollectionActionResult {
  success: boolean;
  error?: string;
  requiresAuth?: boolean;
}

export interface CollectionMutationResult extends CollectionActionResult {
  collection?: SavedCollection;
}

export interface CollectionPlacesResult {
  collection: SavedCollection | null;
  places: Place[];
  error?: string;
}

function mapDbCollection(row: DbSavedCollection, placeCount = 0): SavedCollection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverPhotoUrl: row.cover_photo_url,
    placeCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCollectionName(name: string): string {
  return name.trim();
}

function isDuplicateNameError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('saved_collections_user_name_unique_idx') || lower.includes('duplicate');
}

async function fetchCollectionPlaceCounts(
  collectionIds: string[],
): Promise<Record<string, number>> {
  const supabase = getSupabase();
  if (!supabase || collectionIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('saved_collection_places')
    .select('collection_id')
    .in('collection_id', collectionIds);

  if (error) {
    devWarn('[Nice Place Collections] count error', error.message);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.collection_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

async function attachCoverPhotos(collections: SavedCollection[]): Promise<SavedCollection[]> {
  if (collections.length === 0) {
    return collections;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return collections;
  }

  const needsCover = collections.filter((item) => !item.coverPhotoUrl && item.placeCount > 0);
  if (needsCover.length === 0) {
    return collections;
  }

  const { data, error } = await supabase
    .from('saved_collection_places')
    .select('collection_id, place_id, created_at')
    .in(
      'collection_id',
      needsCover.map((item) => item.id),
    )
    .order('created_at', { ascending: true });

  if (error) {
    devWarn('[Nice Place Collections] cover lookup failed:', error.message);
    return collections;
  }

  const firstPlaceByCollection = new Map<string, string>();
  for (const row of data ?? []) {
    const collectionId = row.collection_id as string;
    if (!firstPlaceByCollection.has(collectionId)) {
      firstPlaceByCollection.set(collectionId, row.place_id as string);
    }
  }

  const placeIds = Array.from(new Set(firstPlaceByCollection.values()));
  if (placeIds.length === 0) {
    return collections;
  }

  const { data: placeRows, error: placeError } = await supabase
    .from('places')
    .select('id, cover_photo_url')
    .in('id', placeIds)
    .eq('status', 'approved');

  if (placeError) {
    return collections;
  }

  const coverByPlaceId = new Map<string, string>();
  for (const row of placeRows ?? []) {
    if (row.cover_photo_url) {
      coverByPlaceId.set(row.id as string, row.cover_photo_url as string);
    }
  }

  return collections.map((item) => {
    if (item.coverPhotoUrl) {
      return item;
    }
    const firstPlaceId = firstPlaceByCollection.get(item.id);
    const cover = firstPlaceId ? coverByPlaceId.get(firstPlaceId) ?? null : null;
    return cover ? { ...item, coverPhotoUrl: cover } : item;
  });
}

export async function getMyCollections(profileId: string): Promise<SavedCollection[]> {
  if (!profileId) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await readCollectionsListCache(profileId, { allowExpired: true })) ?? [];
  }

  try {
    const collections = await dedupeRequest(`collections:list:${profileId}`, async () => {
      const { data, error } = await supabase
        .from('saved_collections')
        .select('*')
        .eq('user_id', profileId)
        .order('updated_at', { ascending: false });

      if (error) {
        devWarn('[Nice Place Collections] list error', error.message);
        return null;
      }

      const rows = (data ?? []) as DbSavedCollection[];
      const counts = await fetchCollectionPlaceCounts(rows.map((row) => row.id));
      const mapped = rows.map((row) => mapDbCollection(row, counts[row.id] ?? 0));
      const withCovers = await attachCoverPhotos(mapped);
      writeCollectionsListCache(profileId, withCovers);
      return withCovers;
    });

    if (collections !== null) {
      markNetworkSuccess();
      return collections;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place Collections] list request failed:', error);
  }

  const cached = (await readCollectionsListCache(profileId, { allowExpired: true })) ?? [];
  if (cached.length > 0) {
    markNetworkFailure();
  }
  return cached;
}

export async function getCollectionById(
  profileId: string,
  collectionId: string,
): Promise<SavedCollection | null> {
  if (!profileId || !collectionId) {
    return null;
  }

  const collections = await getMyCollections(profileId);
  return collections.find((item) => item.id === collectionId) ?? null;
}

export async function createCollection(
  profileId: string,
  name: string,
  description?: string | null,
): Promise<CollectionMutationResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }
  if (!profileId) {
    return { success: false, requiresAuth: true, error: 'collections.errors.signInCreate' };
  }

  const trimmedName = normalizeCollectionName(name);
  if (!trimmedName) {
    return { success: false, error: 'collections.errors.nameRequired' };
  }
  if (trimmedName.length > COLLECTION_NAME_MAX_LENGTH) {
    return { success: false, error: 'collections.errors.nameTooLong' };
  }

  const trimmedDescription = description?.trim() || null;
  if (trimmedDescription && trimmedDescription.length > COLLECTION_DESCRIPTION_MAX_LENGTH) {
    return { success: false, error: 'collections.errors.descriptionTooLong' };
  }

  const { data, error } = await supabase
    .from('saved_collections')
    .insert({
      user_id: profileId,
      name: trimmedName,
      description: trimmedDescription,
    })
    .select('*')
    .single();

  if (error) {
    if (isDuplicateNameError(error.message)) {
      return { success: false, error: 'collections.errors.duplicateName' };
    }
    devWarn('[Nice Place Collections] create error', error.message);
    if (isOfflineOrNetworkError(error.message)) {
      markNetworkFailure();
    }
    return { success: false, error: 'collections.toasts.createFailed' };
  }

  const collection = mapDbCollection(data as DbSavedCollection, 0);
  await invalidateCollectionsCache(profileId);
  devLog('[Nice Place Collections] created', collection.id);
  return { success: true, collection };
}

export async function updateCollection(
  profileId: string,
  collectionId: string,
  updates: { name?: string; description?: string | null; coverPhotoUrl?: string | null },
): Promise<CollectionMutationResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }
  if (!profileId) {
    return { success: false, requiresAuth: true, error: 'collections.errors.signInUpdate' };
  }

  const payload: Partial<DbSavedCollection> = {};
  if (updates.name !== undefined) {
    const trimmedName = normalizeCollectionName(updates.name);
    if (!trimmedName) {
      return { success: false, error: 'collections.errors.nameRequired' };
    }
    if (trimmedName.length > COLLECTION_NAME_MAX_LENGTH) {
      return { success: false, error: 'collections.errors.nameTooLong' };
    }
    payload.name = trimmedName;
  }
  if (updates.description !== undefined) {
    const trimmedDescription = updates.description?.trim() || null;
    if (trimmedDescription && trimmedDescription.length > COLLECTION_DESCRIPTION_MAX_LENGTH) {
      return { success: false, error: 'collections.errors.descriptionTooLong' };
    }
    payload.description = trimmedDescription;
  }
  if (updates.coverPhotoUrl !== undefined) {
    payload.cover_photo_url = updates.coverPhotoUrl;
  }

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'collections.errors.noChanges' };
  }

  const { data, error } = await supabase
    .from('saved_collections')
    .update(payload)
    .eq('id', collectionId)
    .eq('user_id', profileId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isDuplicateNameError(error.message)) {
      return { success: false, error: 'collections.errors.duplicateName' };
    }
    devWarn('[Nice Place Collections] update error', error.message);
    return { success: false, error: 'collections.toasts.updateFailed' };
  }
  if (!data) {
    return { success: false, error: 'collections.errors.notFound' };
  }

  const counts = await fetchCollectionPlaceCounts([collectionId]);
  const collection = mapDbCollection(data as DbSavedCollection, counts[collectionId] ?? 0);
  await invalidateCollectionsCache(profileId);
  await invalidateCollectionPlacesCache(collectionId);
  return { success: true, collection };
}

export async function deleteCollection(
  profileId: string,
  collectionId: string,
): Promise<CollectionActionResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }
  if (!profileId) {
    return { success: false, requiresAuth: true, error: 'collections.errors.signInDelete' };
  }

  const { error } = await supabase
    .from('saved_collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', profileId);

  if (error) {
    devWarn('[Nice Place Collections] delete error', error.message);
    return { success: false, error: 'collections.toasts.deleteFailed' };
  }

  await invalidateCollectionsCache(profileId);
  await invalidateCollectionPlacesCache(collectionId);
  devLog('[Nice Place Collections] deleted', collectionId);
  return { success: true };
}

export async function getCollectionPlaces(
  profileId: string,
  collectionId: string,
  viewerProfileId?: string | null,
): Promise<CollectionPlacesResult> {
  if (!profileId || !collectionId) {
    return { collection: null, places: [] };
  }

  const collection = await getCollectionById(profileId, collectionId);
  if (!collection) {
    return { collection: null, places: [], error: 'collections.errors.notFound' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    const cached = (await readCollectionPlacesCache(collectionId, { allowExpired: true })) ?? [];
    return { collection, places: cached };
  }

  try {
    const places = await dedupeRequest(
      `collections:places:${collectionId}:${viewerProfileId ?? profileId}`,
      async () => {
        const { data: links, error: linksError } = await supabase
          .from('saved_collection_places')
          .select('place_id, created_at')
          .eq('collection_id', collectionId)
          .order('created_at', { ascending: false });

        if (linksError) {
          devWarn('[Nice Place Collections] places link error', linksError.message);
          return null;
        }

        const ids = (links ?? []).map((row) => row.place_id as string);
        if (ids.length === 0) {
          writeCollectionPlacesCache(collectionId, []);
          return [] as Place[];
        }

        const { data, error } = await supabase
          .from('places')
          .select(PLACE_SELECT)
          .in('id', ids)
          .eq('status', 'approved');

        if (error) {
          devWarn('[Nice Place Collections] places error', error.message);
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
        writeCollectionPlacesCache(collectionId, sorted);
        return sorted;
      },
    );

    if (places !== null) {
      markNetworkSuccess();
      return { collection, places };
    }
  } catch (error: unknown) {
    devWarn('[Nice Place Collections] places request failed:', error);
  }

  const cached = (await readCollectionPlacesCache(collectionId, { allowExpired: true })) ?? [];
  if (cached.length > 0) {
    markNetworkFailure();
  }
  return { collection, places: cached };
}

export async function getCollectionsForPlace(
  profileId: string,
  placeId: string,
): Promise<string[]> {
  if (!profileId || !placeId) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await readPlaceCollectionIdsCache(profileId, placeId, { allowExpired: true })) ?? [];
  }

  try {
    const ids = await dedupeRequest(`collections:for-place:${profileId}:${placeId}`, async () => {
      const { data: collections, error: collectionsError } = await supabase
        .from('saved_collections')
        .select('id')
        .eq('user_id', profileId);

      if (collectionsError) {
        devWarn('[Nice Place Collections] membership collections error', collectionsError.message);
        return null;
      }

      const collectionIds = (collections ?? []).map((row) => row.id as string);
      if (collectionIds.length === 0) {
        writePlaceCollectionIdsCache(profileId, placeId, []);
        return [];
      }

      const { data, error } = await supabase
        .from('saved_collection_places')
        .select('collection_id')
        .eq('place_id', placeId)
        .in('collection_id', collectionIds);

      if (error) {
        devWarn('[Nice Place Collections] membership error', error.message);
        return null;
      }

      const memberIds = (data ?? []).map((row) => row.collection_id as string);
      writePlaceCollectionIdsCache(profileId, placeId, memberIds);
      return memberIds;
    });

    if (ids !== null) {
      markNetworkSuccess();
      return ids;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place Collections] membership request failed:', error);
  }

  return (await readPlaceCollectionIdsCache(profileId, placeId, { allowExpired: true })) ?? [];
}

export async function addPlaceToCollection(
  profileId: string,
  collectionId: string,
  placeId: string,
  options?: { saveCount?: number; autoSave?: boolean },
): Promise<CollectionActionResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }
  if (!profileId) {
    return { success: false, requiresAuth: true, error: 'collections.errors.signInManage' };
  }

  const collection = await getCollectionById(profileId, collectionId);
  if (!collection) {
    return { success: false, error: 'collections.errors.notFound' };
  }

  const autoSave = options?.autoSave !== false;
  if (autoSave) {
    const savedIds = await getSavedPlaceIds(profileId);
    if (!savedIds.includes(placeId)) {
      const saveResult = await savePlace(profileId, placeId, options?.saveCount ?? 0);
      if (!saveResult.success) {
        return {
          success: false,
          requiresAuth: saveResult.requiresAuth,
          error: saveResult.error,
        };
      }
    }
  }

  const { error } = await supabase.from('saved_collection_places').insert({
    collection_id: collectionId,
    place_id: placeId,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: true };
    }
    devWarn('[Nice Place Collections] add place error', error.message);
    return { success: false, error: 'collections.toasts.updateFailed' };
  }

  await invalidateCollectionsCache(profileId);
  await invalidateCollectionPlacesCache(collectionId);
  await invalidatePlaceCollectionsCache(profileId, placeId);
  devLog('[Nice Place Collections] added place', placeId, 'to', collectionId);
  return { success: true };
}

export async function removePlaceFromCollection(
  profileId: string,
  collectionId: string,
  placeId: string,
): Promise<CollectionActionResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }
  if (!profileId) {
    return { success: false, requiresAuth: true, error: 'collections.errors.signInManage' };
  }

  const { error } = await supabase
    .from('saved_collection_places')
    .delete()
    .eq('collection_id', collectionId)
    .eq('place_id', placeId);

  if (error) {
    devWarn('[Nice Place Collections] remove place error', error.message);
    return { success: false, error: 'collections.toasts.removeFailed' };
  }

  await invalidateCollectionsCache(profileId);
  await invalidateCollectionPlacesCache(collectionId);
  await invalidatePlaceCollectionsCache(profileId, placeId);
  devLog('[Nice Place Collections] removed place', placeId, 'from', collectionId);
  return { success: true };
}

export async function togglePlaceInCollection(
  profileId: string,
  collectionId: string,
  placeId: string,
  currentlyInCollection: boolean,
  options?: { saveCount?: number; autoSave?: boolean },
): Promise<CollectionActionResult & { inCollection?: boolean }> {
  if (currentlyInCollection) {
    const result = await removePlaceFromCollection(profileId, collectionId, placeId);
    return { ...result, inCollection: false };
  }
  const result = await addPlaceToCollection(profileId, collectionId, placeId, options);
  return { ...result, inCollection: result.success ? true : currentlyInCollection };
}

export async function removePlaceFromAllCollections(
  profileId: string,
  placeId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !profileId || !placeId) {
    return;
  }

  const { data: collections, error: collectionsError } = await supabase
    .from('saved_collections')
    .select('id')
    .eq('user_id', profileId);

  if (collectionsError) {
    devWarn('[Nice Place Collections] purge lookup error', collectionsError.message);
    return;
  }

  const collectionIds = (collections ?? []).map((row) => row.id as string);
  if (collectionIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('saved_collection_places')
    .delete()
    .eq('place_id', placeId)
    .in('collection_id', collectionIds);

  if (error) {
    devWarn('[Nice Place Collections] purge error', error.message);
    return;
  }

  await invalidateCollectionsCache(profileId);
  await invalidatePlaceCollectionsCache(profileId, placeId);
  for (const collectionId of collectionIds) {
    await invalidateCollectionPlacesCache(collectionId);
  }
  devLog('[Nice Place Collections] removed place from all collections', placeId);
}
