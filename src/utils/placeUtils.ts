import { MOCK_PLACES } from '../constants/mockPlaces';
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
  const sameCategory = allPlaces.filter(
    (p) => p.id !== place.id && p.category === place.category,
  );
  const others = allPlaces.filter(
    (p) => p.id !== place.id && p.category !== place.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}
