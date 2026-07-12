import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { Platform } from 'react-native';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type NotificationType,
} from '../constants/notificationTypes';
import { getNotificationTemplate } from '../constants/notificationTemplates';
import {
  invalidateNotificationCaches,
  readNotificationListCache,
  readNotificationPreferencesCache,
  readUnreadCountCache,
  writeNotificationListCache,
  writeNotificationPreferencesCache,
  writeUnreadCountCache,
} from '../cache/notificationsCache';
import type {
  AppNotification,
  DbNotification,
  DbPushToken,
  DbUserNotificationSettings,
  NotificationData,
} from '../types/notification';
import { devLog, devWarn } from '../utils/devLog';

import {
  ensureAndroidNotificationChannel,
  ensureNotificationPermission,
  getNotificationPermissionStatus as getNativeNotificationPermission,
  requestNotificationPermission as requestNativeNotificationPermission,
  type PermissionState,
} from './appPermissionsService';
import { getSupabase, isSupabaseConfigured } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermissionStatus = 'enabled' | 'disabled' | 'denied' | 'undetermined';

export type NotificationActionErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_payload'
  | 'server_error'
  | 'network_error'
  | 'relay_error';

export interface NotificationActionResult {
  success: boolean;
  error?: string;
  code?: NotificationActionErrorCode;
  sent?: number;
}

export interface DispatchNotificationInput {
  type: NotificationType;
  placeId?: string;
  requestId?: string;
  actorName?: string;
  customTitle?: string;
  customBody?: string;
  data?: NotificationData;
}

export interface BroadcastNotificationInput {
  type: 'SYSTEM' | 'EVENT';
  title: string;
  body: string;
  data?: NotificationData;
}

function mapDbSettings(row: DbUserNotificationSettings): NotificationPreferences {
  return {
    pushEnabled: row.push_enabled,
    placeApproved: row.place_approved,
    placeRejected: row.place_rejected,
    placeUpdateApproved: row.place_update_approved,
    placeUpdateRejected: row.place_update_rejected,
    placeLiked: row.place_liked,
    systemAnnouncements: row.system_announcements,
    eventsNews: row.events_news,
  };
}

function mapDbNotification(row: DbNotification): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    data: (row.data ?? {}) as NotificationData,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

function preferencesToDbPatch(
  preferences: Partial<NotificationPreferences>,
): Partial<DbUserNotificationSettings> {
  const patch: Partial<DbUserNotificationSettings> = {};
  if (preferences.pushEnabled !== undefined) patch.push_enabled = preferences.pushEnabled;
  if (preferences.placeApproved !== undefined) patch.place_approved = preferences.placeApproved;
  if (preferences.placeRejected !== undefined) patch.place_rejected = preferences.placeRejected;
  if (preferences.placeUpdateApproved !== undefined) {
    patch.place_update_approved = preferences.placeUpdateApproved;
  }
  if (preferences.placeUpdateRejected !== undefined) {
    patch.place_update_rejected = preferences.placeUpdateRejected;
  }
  if (preferences.placeLiked !== undefined) patch.place_liked = preferences.placeLiked;
  if (preferences.systemAnnouncements !== undefined) {
    patch.system_announcements = preferences.systemAnnouncements;
  }
  if (preferences.eventsNews !== undefined) patch.events_news = preferences.eventsNews;
  return patch;
}

function mapPermissionStateToLegacy(state: PermissionState): NotificationPermissionStatus {
  switch (state) {
    case 'granted':
      return 'enabled';
    case 'denied':
    case 'blocked':
      return 'denied';
    case 'unavailable':
      return 'disabled';
    default:
      return 'undetermined';
  }
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!Device.isDevice) {
    return 'disabled';
  }

  const snapshot = await getNativeNotificationPermission();
  return mapPermissionStateToLegacy(snapshot.state);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!Device.isDevice) {
    return 'disabled';
  }

  const result = await requestNativeNotificationPermission();
  return mapPermissionStateToLegacy(result.state);
}

export async function ensureNotificationPermissionForFeature(): Promise<{
  granted: boolean;
  shouldOpenSettings: boolean;
  status: NotificationPermissionStatus;
}> {
  if (!Device.isDevice) {
    return { granted: false, shouldOpenSettings: false, status: 'disabled' };
  }

  const result = await ensureNotificationPermission();
  return {
    granted: result.granted,
    shouldOpenSettings: result.shouldOpenSettings,
    status: mapPermissionStateToLegacy(result.state),
  };
}

export function notificationStatusLabel(status: NotificationPermissionStatus): string {
  switch (status) {
    case 'enabled':
      return 'Allowed';
    case 'disabled':
      return 'Unavailable';
    case 'denied':
      return 'Denied on device';
    default:
      return 'Not requested';
  }
}

export async function getExpoPushTokenIfPermitted(): Promise<string | null> {
  if (!Device.isDevice || !isSupabaseConfigured()) {
    return null;
  }

  const snapshot = await getNativeNotificationPermission();
  if (snapshot.state !== 'granted') {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    devWarn('[Nice Place Notifications] missing EAS project id');
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResult.data;
  } catch (error: unknown) {
    devWarn('[Nice Place Notifications] push token failed:', error);
    return null;
  }
}

/** @deprecated Use getExpoPushTokenIfPermitted — does not request OS permission. */
export async function registerForPush(): Promise<string | null> {
  return getExpoPushTokenIfPermitted();
}

export async function savePushToken(
  profileId: string,
  token: string,
  deviceId?: string | null,
): Promise<NotificationActionResult> {
  const supabase = getSupabase();
  if (!supabase || !profileId || !token) {
    return { success: false, error: 'settings.notifications.saveTokenFailed' };
  }

  const platform: DbPushToken['platform'] =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';

  const { error } = await supabase.from('push_tokens').upsert(
    {
      profile_id: profileId,
      token,
      platform,
      device_id: deviceId ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id,token' },
  );

  if (error) {
    devWarn('[Nice Place Notifications] save token failed:', error.message);
    return { success: false, error: error.message };
  }

  devLog('[Nice Place Notifications] token saved');
  return { success: true };
}

export async function deactivatePushToken(profileId: string, token: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !profileId || !token) {
    return;
  }

  await supabase
    .from('push_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .eq('token', token);
}

export async function deactivateAllPushTokens(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return;
  }

  await supabase
    .from('push_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId);
}

/** @deprecated Use deactivatePushToken */
export async function removePushToken(profileId: string, token: string): Promise<void> {
  await deactivatePushToken(profileId, token);
}

export async function getNotificationPreferences(
  profileId: string,
): Promise<NotificationPreferences> {
  if (!profileId) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const cached = await readNotificationPreferencesCache(profileId, { allowExpired: true });
  if (cached) {
    return cached;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  await supabase.rpc('ensure_notification_settings', { p_profile_id: profileId });

  const { data, error } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const preferences = mapDbSettings(data as DbUserNotificationSettings);
  writeNotificationPreferencesCache(profileId, preferences);
  return preferences;
}

export async function updateNotificationPreferences(
  profileId: string,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationActionResult> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return { success: false, error: 'notifications.errors.notSignedIn' };
  }

  await supabase.rpc('ensure_notification_settings', { p_profile_id: profileId });

  const current = await getNotificationPreferences(profileId);
  const next = { ...current, ...patch };

  const { error } = await supabase
    .from('user_notification_settings')
    .upsert({
      profile_id: profileId,
      ...preferencesToDbPatch(next),
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId);

  if (error) {
    devWarn('[Nice Place Notifications] preferences update failed:', error.message);
    return { success: false, error: 'settings.notifications.saveFailed' };
  }

  writeNotificationPreferencesCache(profileId, next);
  invalidateNotificationCaches(profileId);
  return { success: true };
}

export async function getNotifications(profileId: string): Promise<AppNotification[]> {
  if (!profileId) {
    return [];
  }

  const cached = await readNotificationListCache(profileId, { allowExpired: true });
  if (cached) {
    return cached;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    devWarn('[Nice Place Notifications] list failed:', error.message);
    return cached ?? [];
  }

  const list = (data ?? []).map((row) => mapDbNotification(row as DbNotification));
  writeNotificationListCache(profileId, list);
  return list;
}

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  if (!profileId) {
    return 0;
  }

  const cached = await readUnreadCountCache(profileId, { allowExpired: true });
  if (typeof cached === 'number') {
    return cached;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .eq('is_read', false);

  if (error) {
    return 0;
  }

  const unread = count ?? 0;
  writeUnreadCountCache(profileId, unread);
  return unread;
}

export async function markNotificationAsRead(
  profileId: string,
  notificationId: string,
): Promise<NotificationActionResult> {
  const supabase = getSupabase();
  if (!supabase || !profileId || !notificationId) {
    return { success: false, error: 'notifications.errors.markReadFailed' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', profileId);

  if (error) {
    return { success: false, error: 'notifications.errors.markReadFailed' };
  }

  invalidateNotificationCaches(profileId);
  return { success: true };
}

export async function markAllNotificationsAsRead(profileId: string): Promise<NotificationActionResult> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return { success: false, error: 'notifications.errors.markAllFailed' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', profileId)
    .eq('is_read', false);

  if (error) {
    return { success: false, error: 'notifications.errors.markAllFailed' };
  }

  invalidateNotificationCaches(profileId);
  await Notifications.setBadgeCountAsync(0).catch(() => undefined);
  return { success: true };
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data as Record<string, unknown> },
    trigger: null,
  });
}

async function readFunctionErrorBody(error: FunctionsHttpError): Promise<{
  message: string;
  status: number;
}> {
  const context = error.context as Response | undefined;
  const status = context?.status ?? 500;

  if (!context || typeof context.json !== 'function') {
    return {
      status,
      message: error.message || `Request failed (${status}).`,
    };
  }

  try {
    const payload = (await context.json()) as { error?: string };
    return {
      status,
      message: payload.error ?? `Request failed (${status}).`,
    };
  } catch {
    return {
      status,
      message: `Request failed (${status}).`,
    };
  }
}

function mapHttpStatusToCode(status: number): NotificationActionErrorCode {
  if (status === 401) {
    return 'unauthenticated';
  }
  if (status === 403) {
    return 'forbidden';
  }
  if (status === 400) {
    return 'invalid_payload';
  }
  return 'server_error';
}

async function invokeDispatchFunction(body: Record<string, unknown>): Promise<NotificationActionResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.', code: 'server_error' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const hasSession = Boolean(sessionData.session?.access_token);

  if (__DEV__) {
    devLog('[Nice Place Notifications] invoking dispatch-notification', {
      mode: body.mode,
      type: body.type,
      hasSession,
    });
  }

  const { data, error } = await supabase.functions.invoke('dispatch-notification', { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = await readFunctionErrorBody(error);
      devWarn('[Nice Place Notifications] dispatch HTTP error', {
        status: parsed.status,
        message: parsed.message,
        type: body.type,
        hasSession,
      });
      return {
        success: false,
        error: parsed.message,
        code: mapHttpStatusToCode(parsed.status),
      };
    }

    if (error instanceof FunctionsRelayError) {
      devWarn('[Nice Place Notifications] dispatch relay error:', error.message);
      return { success: false, error: error.message, code: 'relay_error' };
    }

    if (error instanceof FunctionsFetchError) {
      devWarn('[Nice Place Notifications] dispatch fetch error:', error.message);
      return { success: false, error: error.message, code: 'network_error' };
    }

    devWarn('[Nice Place Notifications] dispatch failed:', error.message);
    return { success: false, error: error.message, code: 'server_error' };
  }

  const result = data as { success?: boolean; error?: string; sent?: number } | null;
  if (result?.success === false) {
    return { success: false, error: result.error ?? 'Dispatch failed.', code: 'server_error' };
  }

  return { success: true, sent: typeof result?.sent === 'number' ? result.sent : undefined };
}

export async function sendPushIfEnabled(input: DispatchNotificationInput): Promise<NotificationActionResult> {
  return invokeDispatchFunction({
    mode: 'user',
    type: input.type,
    placeId: input.placeId,
    requestId: input.requestId,
    actorName: input.actorName,
    customTitle: input.customTitle,
    customBody: input.customBody,
    data: input.data,
  });
}

export async function broadcastNotification(
  input: BroadcastNotificationInput,
): Promise<NotificationActionResult> {
  return invokeDispatchFunction({
    mode: 'broadcast',
    type: input.type,
    customTitle: input.title,
    customBody: input.body,
    data: input.data,
  });
}

export async function notifyPlaceApproved(placeId: string) {
  return sendPushIfEnabled({
    type: 'PLACE_APPROVED',
    placeId,
  });
}

export async function notifyPlaceRejected(placeId: string) {
  return sendPushIfEnabled({
    type: 'PLACE_REJECTED',
    placeId,
  });
}

export async function notifyPlaceUpdateApproved(requestId: string) {
  return sendPushIfEnabled({
    type: 'PLACE_UPDATED_APPROVED',
    requestId,
  });
}

export async function notifyPlaceUpdateRejected(requestId: string) {
  return sendPushIfEnabled({
    type: 'PLACE_UPDATED_REJECTED',
    requestId,
  });
}

export async function notifyPlaceLiked(input: { placeId: string; actorName?: string }) {
  return sendPushIfEnabled({
    type: 'PLACE_LIKED',
    placeId: input.placeId,
    actorName: input.actorName,
  });
}

export function previewNotificationCopy(
  type: NotificationType,
  input?: { placeTitle?: string; actorName?: string },
) {
  return getNotificationTemplate(type, input);
}

export async function syncBadgeCount(profileId: string): Promise<void> {
  const count = await getUnreadNotificationCount(profileId);
  await Notifications.setBadgeCountAsync(count).catch(() => undefined);
}
