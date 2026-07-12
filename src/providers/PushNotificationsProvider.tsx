import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { AppState, Platform } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { subscribeNotifications } from '../hooks/useNotifications';
import { navigateFromNotificationData } from '../navigation/notificationNavigation';
import { getNotificationPermissionStatus } from '../services/appPermissionsService';
import {
  deactivatePushToken,
  getExpoPushTokenIfPermitted,
  getNotificationPreferences,
  savePushToken,
  syncBadgeCount,
} from '../services/notificationService';
import { devLog } from '../utils/devLog';

let lastRegisteredToken: string | null = null;

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const tokenRef = useRef<string | null>(null);

  const registerTokenIfAllowed = useCallback(async () => {
    if (!profileId) {
      return;
    }

    const permission = await getNotificationPermissionStatus();
    if (permission.state !== 'granted') {
      return;
    }

    const preferences = await getNotificationPreferences(profileId);
    if (!preferences.pushEnabled) {
      return;
    }

    const token = await getExpoPushTokenIfPermitted();
    if (!token) {
      devLog('[Nice Place Notifications] no push token while permission granted');
      return;
    }

    tokenRef.current = token;
    lastRegisteredToken = token;

    const deviceId =
      Platform.OS === 'android'
        ? Application.getAndroidId?.() ?? null
        : await Application.getIosIdForVendorAsync?.().catch(() => null);

    const result = await savePushToken(profileId, token, deviceId);
    if (!result.success) {
      devLog('[Nice Place Notifications] token save failed:', result.error);
      return;
    }

    await syncBadgeCount(profileId);
    devLog('[Nice Place Notifications] registered');
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      const previousToken = tokenRef.current;
      if (previousToken) {
        void deactivatePushToken(profileId ?? '', previousToken);
        tokenRef.current = null;
        lastRegisteredToken = null;
      }
      return;
    }

    void registerTokenIfAllowed();
  }, [profileId, registerTokenIfAllowed]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && profileId) {
        void registerTokenIfAllowed();
      }
    });

    return () => subscription.remove();
  }, [profileId, registerTokenIfAllowed]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const refreshBadge = () => {
      void syncBadgeCount(profileId);
    };

    const unsubscribe = subscribeNotifications(refreshBadge);
    return unsubscribe;
  }, [profileId]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      if (profileId) {
        void syncBadgeCount(profileId);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      navigateFromNotificationData(data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [profileId]);

  return <>{children}</>;
}

export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredToken;
}
