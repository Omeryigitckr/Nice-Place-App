export interface MapCameraTarget {
  latitude: number;
  longitude: number;
}

export interface MapCameraFlyOptions {
  durationMs?: number;
  zoomLevel?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  animationMode?: 'easeTo' | 'flyTo' | 'linearTo' | 'moveTo';
}

/**
 * Fast, premium camera timing based on approximate distance.
 * Clamped to 300–600ms.
 */
export function estimateCameraDurationMs(
  from: MapCameraTarget | null | undefined,
  toLatitude: number,
  toLongitude: number,
): number {
  if (!from) {
    return 400;
  }

  const dLat = toLatitude - from.latitude;
  const dLng =
    (toLongitude - from.longitude) * Math.cos((toLatitude * Math.PI) / 180);
  const degrees = Math.sqrt(dLat * dLat + dLng * dLng);
  const km = degrees * 111;
  const ms = 300 + Math.min(km * 28, 300);

  return Math.round(Math.min(600, Math.max(300, ms)));
}
