export type {
  NotificationPermissionStatus,
} from './notificationService';

export {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  ensureNotificationPermissionForFeature,
  notificationStatusLabel,
  getExpoPushTokenIfPermitted,
  registerForPush,
  savePushToken,
  deactivatePushToken,
  deactivateAllPushTokens,
  removePushToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendLocalNotification,
  sendPushIfEnabled,
  broadcastNotification,
  notifyPlaceApproved,
  notifyPlaceRejected,
  notifyPlaceUpdateApproved,
  notifyPlaceUpdateRejected,
  notifyPlaceLiked,
  previewNotificationCopy,
  syncBadgeCount,
} from './notificationService';

export type {
  NotificationActionResult,
  DispatchNotificationInput,
  BroadcastNotificationInput,
} from './notificationService';
