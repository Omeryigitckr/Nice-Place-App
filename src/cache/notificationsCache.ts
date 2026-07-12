import { CACHE_KEYS, CACHE_TTL } from './cacheKeys';
import type { NotificationPreferences } from '../constants/notificationTypes';
import type { AppNotification } from '../types/notification';

import { getCache, removeCache, setCacheAsync } from './cacheStorage';

export async function readNotificationListCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<AppNotification[] | null> {
  return getCache<AppNotification[]>(CACHE_KEYS.notificationsList(profileId), options);
}

export function writeNotificationListCache(profileId: string, list: AppNotification[]): void {
  setCacheAsync(CACHE_KEYS.notificationsList(profileId), list, CACHE_TTL.notificationsMs);
}

export async function readUnreadCountCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<number | null> {
  return getCache<number>(CACHE_KEYS.notificationsUnread(profileId), options);
}

export function writeUnreadCountCache(profileId: string, count: number): void {
  setCacheAsync(CACHE_KEYS.notificationsUnread(profileId), count, CACHE_TTL.notificationsMs);
}

export async function readNotificationPreferencesCache(
  profileId: string,
  options?: { allowExpired?: boolean },
): Promise<NotificationPreferences | null> {
  return getCache<NotificationPreferences>(CACHE_KEYS.notificationPreferences(profileId), options);
}

export function writeNotificationPreferencesCache(
  profileId: string,
  preferences: NotificationPreferences,
): void {
  setCacheAsync(
    CACHE_KEYS.notificationPreferences(profileId),
    preferences,
    CACHE_TTL.notificationPreferencesMs,
  );
}

export async function invalidateNotificationCaches(profileId: string): Promise<void> {
  await Promise.all([
    removeCache(CACHE_KEYS.notificationsList(profileId)),
    removeCache(CACHE_KEYS.notificationsUnread(profileId)),
    removeCache(CACHE_KEYS.notificationPreferences(profileId)),
  ]);
}
