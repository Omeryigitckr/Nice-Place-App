import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { Coordinates } from '../utils/distance';

interface UseUserLocationResult {
  location: Coordinates | null;
  permissionGranted: boolean;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const setup = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const granted = status === 'granted';

        if (!mounted) {
          return;
        }

        setPermissionGranted(granted);

        if (!granted) {
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && mounted) {
          setLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
          },
          (position) => {
            if (!mounted) {
              return;
            }

            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
        );
      } catch {
        if (mounted) {
          setPermissionGranted(false);
        }
      }
    };

    setup();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return { location, permissionGranted };
}
