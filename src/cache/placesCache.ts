import { OwnedPlace, Place } from '../types/place';
import { PublicProfileSummary } from '../types/publicProfile';

import { CACHE_KEYS, CACHE_TTL } from './cacheKeys';
import { getCache, removeCacheAsync, setCacheAsync } from './cacheStorage';

export interface CachedPlaceDetail {
  place: Place;
  createdBy: string | null;
  creator: PublicProfileSummary | null;
}

export async function readPlacesListCache(
  options?: { allowExpired?: boolean },
): Promise<Place[] | null> {
  return getCache<Place[]>(CACHE_KEYS.placesList, options);
}

export function writePlacesListCache(places: Place[]): void {
  setCacheAsync(CACHE_KEYS.placesList, places, CACHE_TTL.placesListMs);
  // Map uses the same approved list for markers.
  setCacheAsync(CACHE_KEYS.mapPlaces, places, CACHE_TTL.mapPlacesMs);
}

export async function readMapPlacesCache(
  options?: { allowExpired?: boolean },
): Promise<Place[] | null> {
  const mapPlaces = await getCache<Place[]>(CACHE_KEYS.mapPlaces, options);
  if (mapPlaces?.length) {
    return mapPlaces;
  }
  return readPlacesListCache(options);
}

export function writeMapPlacesCache(places: Place[]): void {
  setCacheAsync(CACHE_KEYS.mapPlaces, places, CACHE_TTL.mapPlacesMs);
  setCacheAsync(CACHE_KEYS.placesList, places, CACHE_TTL.placesListMs);
}

export async function readPlaceDetailCache(
  placeId: string,
  options?: { allowExpired?: boolean },
): Promise<CachedPlaceDetail | null> {
  if (!placeId) {
    return null;
  }
  return getCache<CachedPlaceDetail>(CACHE_KEYS.placeDetail(placeId), options);
}

export function writePlaceDetailCache(detail: CachedPlaceDetail): void {
  if (!detail.place?.id) {
    return;
  }
  setCacheAsync(
    CACHE_KEYS.placeDetail(detail.place.id),
    detail,
    CACHE_TTL.placeDetailMs,
  );
}

/** Prefer a detail entry; fall back to a place from the list cache. */
export async function readPlaceFromAnyCache(
  placeId: string,
): Promise<CachedPlaceDetail | null> {
  const detail = await readPlaceDetailCache(placeId, { allowExpired: true });
  if (detail) {
    return detail;
  }

  const list = await readPlacesListCache({ allowExpired: true });
  const place = list?.find((item) => item.id === placeId);
  if (!place) {
    return null;
  }

  return { place, createdBy: null, creator: null };
}

export async function readSavedPlacesCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<Place[] | null> {
  if (!profileId) {
    return null;
  }
  return getCache<Place[]>(CACHE_KEYS.savedPlaces(profileId), options);
}

export function writeSavedPlacesCache(profileId: string, places: Place[]): void {
  if (!profileId) {
    return;
  }
  setCacheAsync(CACHE_KEYS.savedPlaces(profileId), places, CACHE_TTL.savedPlacesMs);
}

export async function readMyPlacesCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<OwnedPlace[] | null> {
  if (!profileId) {
    return null;
  }
  return getCache<OwnedPlace[]>(CACHE_KEYS.myPlaces(profileId), options);
}

export function writeMyPlacesCache(profileId: string, places: OwnedPlace[]): void {
  if (!profileId) {
    return;
  }
  setCacheAsync(CACHE_KEYS.myPlaces(profileId), places, CACHE_TTL.myPlacesMs);
}

/** Drop a place from public list/map/detail caches (e.g. after admin soft-delete). */
export async function removePlaceFromPublicCaches(placeId: string): Promise<void> {
  if (!placeId) {
    return;
  }

  const [list, mapPlaces] = await Promise.all([
    readPlacesListCache({ allowExpired: true }),
    readMapPlacesCache({ allowExpired: true }),
  ]);

  if (list?.length) {
    writePlacesListCache(list.filter((place) => place.id !== placeId));
  } else if (mapPlaces?.length) {
    writeMapPlacesCache(mapPlaces.filter((place) => place.id !== placeId));
  }

  removeCacheAsync(CACHE_KEYS.placeDetail(placeId));
}
