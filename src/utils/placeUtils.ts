import { MOCK_PLACES } from '../constants/mockPlaces';
import { resolvePlaceCategoryKeys } from '../constants/placeCategories';
import { Place, QuickFilter } from '../types/place';

import { Coordinates, getPlaceDistanceKm } from './distance';

export function resolvePlacesByIds(ids: string[], catalog: Place[]): Place[] {
  const byId = new Map(catalog.map((place) => [place.id, place]));
  return ids
    .map((id) => byId.get(id))
    .filter((place): place is Place => place != null);
}

export function getPlaceById(id: string): Place | undefined {
  return MOCK_PLACES.find((place) => place.id === id);
}

export function getPlaceOrDefault(id?: string): Place {
  return getPlaceById(id ?? '') ?? MOCK_PLACES[0];
}

export function sortPlaces(
  places: Place[],
  quickFilter: QuickFilter,
  userLocation?: Coordinates | null,
): Place[] {
  if (quickFilter === 'nearby' && userLocation) {
    return [...places].sort((a, b) => {
      const aKm = getPlaceDistanceKm(userLocation, a) ?? Number.POSITIVE_INFINITY;
      const bKm = getPlaceDistanceKm(userLocation, b) ?? Number.POSITIVE_INFINITY;
      return aKm - bKm;
    });
  }

  return places;
}

export function getSimilarPlaces(
  place: Place,
  allPlaces: Place[] = MOCK_PLACES,
  limit = 3,
): Place[] {
  const placeKeys = new Set(resolvePlaceCategoryKeys(place));
  const withSharedCategory = allPlaces.filter((candidate) => {
    if (candidate.id === place.id) {
      return false;
    }
    return resolvePlaceCategoryKeys(candidate).some((key) => placeKeys.has(key));
  });
  const others = allPlaces.filter(
    (candidate) =>
      candidate.id !== place.id &&
      !withSharedCategory.some((shared) => shared.id === candidate.id),
  );
  return [...withSharedCategory, ...others].slice(0, limit);
}
