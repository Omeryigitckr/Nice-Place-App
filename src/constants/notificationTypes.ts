/** Central notification type identifiers — keep stable for server + client. */
export const NOTIFICATION_TYPES = {
  PLACE_APPROVED: 'PLACE_APPROVED',
  PLACE_REJECTED: 'PLACE_REJECTED',
  PLACE_UPDATED_APPROVED: 'PLACE_UPDATED_APPROVED',
  PLACE_UPDATED_REJECTED: 'PLACE_UPDATED_REJECTED',
  PLACE_LIKED: 'PLACE_LIKED',
  SYSTEM: 'SYSTEM',
  EVENT: 'EVENT',
  PROFILE_PHOTO_REMOVED: 'PROFILE_PHOTO_REMOVED',
  PROFILE_USERNAME_RESET: 'PROFILE_USERNAME_RESET',
  PROFILE_SUSPENDED: 'PROFILE_SUSPENDED',
  PROFILE_UNSUSPENDED: 'PROFILE_UNSUSPENDED',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_TYPE_LIST = Object.values(NOTIFICATION_TYPES);

export type NotificationPreferenceKey =
  | 'placeApproved'
  | 'placeRejected'
  | 'placeUpdateApproved'
  | 'placeUpdateRejected'
  | 'placeLiked'
  | 'systemAnnouncements'
  | 'eventsNews';

export interface NotificationPreferences {
  pushEnabled: boolean;
  placeApproved: boolean;
  placeRejected: boolean;
  placeUpdateApproved: boolean;
  placeUpdateRejected: boolean;
  placeLiked: boolean;
  systemAnnouncements: boolean;
  eventsNews: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  placeApproved: true,
  placeRejected: true,
  placeUpdateApproved: true,
  placeUpdateRejected: true,
  placeLiked: true,
  systemAnnouncements: true,
  eventsNews: true,
};

/** Maps notification type → preference field. */
export const NOTIFICATION_TYPE_PREFERENCE_KEY: Record<NotificationType, NotificationPreferenceKey | null> = {
  [NOTIFICATION_TYPES.PLACE_APPROVED]: 'placeApproved',
  [NOTIFICATION_TYPES.PLACE_REJECTED]: 'placeRejected',
  [NOTIFICATION_TYPES.PLACE_UPDATED_APPROVED]: 'placeUpdateApproved',
  [NOTIFICATION_TYPES.PLACE_UPDATED_REJECTED]: 'placeUpdateRejected',
  [NOTIFICATION_TYPES.PLACE_LIKED]: 'placeLiked',
  [NOTIFICATION_TYPES.SYSTEM]: 'systemAnnouncements',
  [NOTIFICATION_TYPES.EVENT]: 'eventsNews',
  [NOTIFICATION_TYPES.PROFILE_PHOTO_REMOVED]: 'systemAnnouncements',
  [NOTIFICATION_TYPES.PROFILE_USERNAME_RESET]: 'systemAnnouncements',
  [NOTIFICATION_TYPES.PROFILE_SUSPENDED]: 'systemAnnouncements',
  [NOTIFICATION_TYPES.PROFILE_UNSUSPENDED]: 'systemAnnouncements',
};

export const NOTIFICATION_PREFERENCE_LABEL_KEYS: Record<NotificationPreferenceKey, string> = {
  placeApproved: 'settings.notifications.prefs.placeApproved',
  placeRejected: 'settings.notifications.prefs.placeRejected',
  placeUpdateApproved: 'settings.notifications.prefs.placeUpdateApproved',
  placeUpdateRejected: 'settings.notifications.prefs.placeUpdateRejected',
  placeLiked: 'settings.notifications.prefs.placeLiked',
  systemAnnouncements: 'settings.notifications.prefs.systemAnnouncements',
  eventsNews: 'settings.notifications.prefs.eventsNews',
};

/** @deprecated Prefer NOTIFICATION_PREFERENCE_LABEL_KEYS + t(). Kept for compatibility. */
export const NOTIFICATION_PREFERENCE_LABELS: Record<NotificationPreferenceKey, string> =
  NOTIFICATION_PREFERENCE_LABEL_KEYS;
