import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  ensureLocationPermission,
  ensureMediaPermission,
  ensureNotificationPermission,
  getLocationPermissionStatus,
  getMediaPermissionStatus,
  getNotificationPermissionStatus,
  openAppSettings,
  requestLocationPermission,
  requestMediaPermission,
  requestNotificationPermission,
  type PermissionEnsureResult,
  type PermissionSnapshot,
} from '../services/appPermissionsService';

export function useAppPermissions() {
  const [notification, setNotification] = useState<PermissionSnapshot>({
    state: 'undetermined',
    canAskAgain: true,
  });
  const [location, setLocation] = useState<PermissionSnapshot>({
    state: 'undetermined',
    canAskAgain: true,
  });
  const [media, setMedia] = useState<PermissionSnapshot>({
    state: 'undetermined',
    canAskAgain: true,
  });

  const refresh = useCallback(async () => {
    const [notificationStatus, locationStatus, mediaStatus] = await Promise.all([
      getNotificationPermissionStatus(),
      getLocationPermissionStatus(),
      getMediaPermissionStatus(),
    ]);
    setNotification(notificationStatus);
    setLocation(locationStatus);
    setMedia(mediaStatus);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refresh();
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [refresh]);

  const ensureNotification = useCallback(async (): Promise<PermissionEnsureResult> => {
    const result = await ensureNotificationPermission();
    setNotification({ state: result.state, canAskAgain: result.canAskAgain });
    return result;
  }, []);

  const ensureLocation = useCallback(async (): Promise<PermissionEnsureResult> => {
    const result = await ensureLocationPermission();
    setLocation({ state: result.state, canAskAgain: result.canAskAgain });
    return result;
  }, []);

  const ensureMedia = useCallback(async (): Promise<PermissionEnsureResult> => {
    const result = await ensureMediaPermission();
    setMedia({ state: result.state, canAskAgain: result.canAskAgain });
    return result;
  }, []);

  return useMemo(
    () => ({
      notification,
      location,
      media,
      refresh,
      requestNotificationPermission,
      requestLocationPermission,
      requestMediaPermission,
      ensureNotificationPermission: ensureNotification,
      ensureLocationPermission: ensureLocation,
      ensureMediaPermission: ensureMedia,
      openAppSettings,
    }),
    [ensureLocation, ensureMedia, ensureNotification, location, media, refresh],
  );
}
