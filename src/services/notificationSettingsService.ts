import { Linking, Platform } from 'react-native';
import { devLog } from '../utils/devLog';

export type NotificationPermissionStatus = 'enabled' | 'disabled' | 'denied' | 'undetermined';

/**
 * Local notification preference helpers.
 *
 * TODO: install and wire `expo-notifications` for push delivery:
 *   npx expo install expo-notifications
 * Until then, preferences are stored locally and permission is requested via
 * the platform settings / limited APIs available without that package.
 */

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  // Without expo-notifications we cannot query OS permission precisely.
  // Treat as undetermined so enabling a toggle can prompt the user to open settings.
  return 'undetermined';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  devLog('[Nice Place Notifications] permission requested');

  // TODO: replace with Notifications.requestPermissionsAsync() after installing expo-notifications.
  // Opening settings is the best we can do without the package.
  try {
    await Linking.openSettings();
  } catch {
    // ignore
  }

  return 'undetermined';
}

export function notificationStatusLabel(status: NotificationPermissionStatus): string {
  switch (status) {
    case 'enabled':
      return 'Enabled';
    case 'disabled':
      return 'Disabled';
    case 'denied':
      return 'Permission denied';
    default:
      return Platform.OS === 'ios' ? 'Not determined' : 'Check device settings';
  }
}
