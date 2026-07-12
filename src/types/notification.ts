import type { NotificationType } from '../constants/notificationTypes';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationData {
  placeId?: string;
  requestId?: string;
  actorProfileId?: string;
  screen?: string;
  [key: string]: unknown;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: NotificationData | null;
  is_read: boolean;
  created_at: string;
}

export interface DbUserNotificationSettings {
  profile_id: string;
  push_enabled: boolean;
  place_approved: boolean;
  place_rejected: boolean;
  place_update_approved: boolean;
  place_update_rejected: boolean;
  place_liked: boolean;
  system_announcements: boolean;
  events_news: boolean;
  updated_at: string;
}

export interface DbPushToken {
  id: string;
  profile_id: string;
  token: string;
  platform: 'ios' | 'android' | 'unknown';
  device_id: string | null;
  is_active?: boolean;
  updated_at: string;
}
