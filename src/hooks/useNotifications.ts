import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  syncBadgeCount,
  updateNotificationPreferences,
} from '../services/notificationService';
import type { NotificationPreferences } from '../constants/notificationTypes';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notificationTypes';
import type { AppNotification } from '../types/notification';

type NotificationsListener = (state: NotificationsState) => void;

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  loading: boolean;
  ready: boolean;
}

const listeners = new Set<NotificationsListener>();
let cachedState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  loading: false,
  ready: false,
};

function notify(state: NotificationsState) {
  cachedState = state;
  listeners.forEach((listener) => listener(state));
}

export function subscribeNotifications(listener: NotificationsListener): () => void {
  listeners.add(listener);
  listener(cachedState);
  return () => {
    listeners.delete(listener);
  };
}

export function resetNotificationsMemory(): void {
  notify({
    notifications: [],
    unreadCount: 0,
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    loading: false,
    ready: false,
  });
}

export function useNotifications(profileId: string | null | undefined) {
  const [state, setState] = useState<NotificationsState>(cachedState);
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;

  useEffect(() => subscribeNotifications(setState), []);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const id = profileIdRef.current;
    if (!id) {
      resetNotificationsMemory();
      return;
    }

    if (!options?.silent) {
      notify({ ...cachedState, loading: true });
    }

    const [notifications, unreadCount, preferences] = await Promise.all([
      getNotifications(id),
      getUnreadNotificationCount(id),
      getNotificationPreferences(id),
    ]);

    notify({
      notifications,
      unreadCount,
      preferences,
      loading: false,
      ready: true,
    });

    await syncBadgeCount(id);
  }, []);

  useEffect(() => {
    if (!profileId) {
      resetNotificationsMemory();
      return;
    }
    void refresh();
  }, [profileId, refresh]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const id = profileIdRef.current;
      if (!id) {
        return;
      }
      const result = await markNotificationAsRead(id, notificationId);
      if (result.success) {
        await refresh({ silent: true });
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    const id = profileIdRef.current;
    if (!id) {
      return;
    }
    const result = await markAllNotificationsAsRead(id);
    if (result.success) {
      await refresh({ silent: true });
    }
  }, [refresh]);

  const updatePreferences = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      const id = profileIdRef.current;
      if (!id) {
        return { success: false, error: 'notifications.errors.notSignedIn' };
      }
      const result = await updateNotificationPreferences(id, patch);
      if (result.success) {
        await refresh({ silent: true });
      }
      return result;
    },
    [refresh],
  );

  return useMemo(
    () => ({
      ...state,
      refresh,
      markRead,
      markAllRead,
      updatePreferences,
    }),
    [markAllRead, markRead, refresh, state, updatePreferences],
  );
}
