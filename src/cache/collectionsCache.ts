import { SavedCollection } from '../types/collection';
import { Place } from '../types/place';

import { CACHE_KEYS, CACHE_TTL } from './cacheKeys';
import { getCache, removeCache, setCacheAsync } from './cacheStorage';

export async function readCollectionsListCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<SavedCollection[] | null> {
  if (!profileId) {
    return null;
  }
  return getCache<SavedCollection[]>(CACHE_KEYS.collectionsList(profileId), options);
}

export function writeCollectionsListCache(profileId: string, collections: SavedCollection[]): void {
  if (!profileId) {
    return;
  }
  setCacheAsync(CACHE_KEYS.collectionsList(profileId), collections, CACHE_TTL.collectionsMs);
}

export async function readCollectionPlacesCache(
  collectionId: string,
  options?: { allowExpired?: boolean },
): Promise<Place[] | null> {
  if (!collectionId) {
    return null;
  }
  return getCache<Place[]>(CACHE_KEYS.collectionPlaces(collectionId), options);
}

export function writeCollectionPlacesCache(collectionId: string, places: Place[]): void {
  if (!collectionId) {
    return;
  }
  setCacheAsync(CACHE_KEYS.collectionPlaces(collectionId), places, CACHE_TTL.collectionsMs);
}

export async function readPlaceCollectionIdsCache(
  profileId: string,
  placeId: string,
  options?: { allowExpired?: boolean },
): Promise<string[] | null> {
  if (!profileId || !placeId) {
    return null;
  }
  return getCache<string[]>(CACHE_KEYS.placeCollections(profileId, placeId), options);
}

export function writePlaceCollectionIdsCache(
  profileId: string,
  placeId: string,
  collectionIds: string[],
): void {
  if (!profileId || !placeId) {
    return;
  }
  setCacheAsync(
    CACHE_KEYS.placeCollections(profileId, placeId),
    collectionIds,
    CACHE_TTL.collectionsMs,
  );
}

export async function invalidateCollectionsCache(profileId: string): Promise<void> {
  if (!profileId) {
    return;
  }
  await removeCache(CACHE_KEYS.collectionsList(profileId));
}

export async function invalidateCollectionPlacesCache(collectionId: string): Promise<void> {
  if (!collectionId) {
    return;
  }
  await Promise.all([
    removeCache(CACHE_KEYS.collectionPlaces(collectionId)),
    removeCache(CACHE_KEYS.collectionDetail(collectionId)),
  ]);
}

export async function invalidatePlaceCollectionsCache(
  profileId: string,
  placeId: string,
): Promise<void> {
  if (!profileId || !placeId) {
    return;
  }
  await removeCache(CACHE_KEYS.placeCollections(profileId, placeId));
}

export async function purgePlaceFromCollectionCaches(
  placeId: string,
  profileId?: string | null,
): Promise<void> {
  if (profileId) {
    await invalidateCollectionsCache(profileId);
  }
  // Place membership caches are keyed per place; list caches refresh on next load.
  if (profileId && placeId) {
    await invalidatePlaceCollectionsCache(profileId, placeId);
  }
}
