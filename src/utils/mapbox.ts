const PLACEHOLDER_VALUES = new Set(['your_mapbox_token_here']);

/** Default map center — Alanya, Antalya (lng, lat) */
export const DEFAULT_MAP_CENTER: [number, number] = [31.9994, 36.5438];

export function getMapboxToken(): string | null {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

  if (!token || PLACEHOLDER_VALUES.has(token)) {
    return null;
  }

  return token;
}

export function getMapboxConfigError(): string | null {
  if (getMapboxToken()) {
    return null;
  }

  return 'Mapbox token is missing. Add EXPO_PUBLIC_MAPBOX_TOKEN to your .env file.';
}

export function computePlacesCenter(places: { latitude: number; longitude: number }[]): [number, number] {
  if (places.length === 0) {
    return DEFAULT_MAP_CENTER;
  }

  const avgLat = places.reduce((sum, place) => sum + place.latitude, 0) / places.length;
  const avgLng = places.reduce((sum, place) => sum + place.longitude, 0) / places.length;

  return [avgLng, avgLat];
}
