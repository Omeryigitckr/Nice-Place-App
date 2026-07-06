import { Linking, Platform } from 'react-native';

import { hapticLight } from '../feedback';

/**
 * Opens turn-by-turn directions in the platform maps app.
 * Kept external on purpose: in-app routing would need directions APIs,
 * polylines, and ongoing location updates — too heavy for launch.
 */
export async function openExternalDirections(
  latitude: number,
  longitude: number,
  label?: string,
): Promise<boolean> {
  hapticLight();

  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  const name = label?.trim() ? encodeURIComponent(label.trim()) : `${lat},${lng}`;

  const candidates =
    Platform.OS === 'ios'
      ? [
          `http://maps.apple.com/?daddr=${lat},${lng}&q=${name}`,
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        ]
      : [
          `google.navigation:q=${lat},${lng}`,
          `geo:${lat},${lng}?q=${lat},${lng}(${name})`,
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        ];

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // Try next candidate.
    }
  }

  try {
    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    );
    return true;
  } catch {
    return false;
  }
}
