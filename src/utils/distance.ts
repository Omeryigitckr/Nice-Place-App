import { DistanceUnit, getCachedAppSettings } from '../services/settingsService';
import { Place } from '../types/place';

export const DISTANCE_UNAVAILABLE = 'Distance unavailable';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

let distanceUnitPreference: DistanceUnit = getCachedAppSettings().distanceUnit;

export function setDistanceUnitPreference(unit: DistanceUnit) {
  distanceUnitPreference = unit;
}

export function getDistanceUnitPreference(): DistanceUnit {
  return distanceUnitPreference;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number, unit: DistanceUnit = distanceUnitPreference): string {
  if (unit === 'mi') {
    const miles = km * 0.621371;
    if (miles < 0.1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function getPlaceDistanceKm(
  user: Coordinates | null | undefined,
  place: Coordinates,
): number | null {
  if (!user) {
    return null;
  }

  return haversineKm(user.latitude, user.longitude, place.latitude, place.longitude);
}

export function getPlaceDistanceLabel(
  user: Coordinates | null | undefined,
  place: Coordinates,
): string {
  const km = getPlaceDistanceKm(user, place);
  if (km == null) {
    return DISTANCE_UNAVAILABLE;
  }

  return formatDistance(km);
}

export function withPlaceDistance(
  place: Place,
  user: Coordinates | null | undefined,
): Place {
  return {
    ...place,
    distance: getPlaceDistanceLabel(user, place),
  };
}

export function withPlaceDistances(
  places: Place[],
  user: Coordinates | null | undefined,
): Place[] {
  return places.map((place) => withPlaceDistance(place, user));
}
