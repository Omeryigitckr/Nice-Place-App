export type NotificationPermissionStatus = 'enabled' | 'disabled' | 'denied' | 'undetermined';

/** Push notifications are not wired for the beta release. */
export const NOTIFICATIONS_COMING_SOON = true;

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  return 'disabled';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  return 'disabled';
}

export function notificationStatusLabel(status: NotificationPermissionStatus): string {
  if (NOTIFICATIONS_COMING_SOON) {
    return 'Coming soon';
  }

  switch (status) {
    case 'enabled':
      return 'Enabled';
    case 'disabled':
      return 'Disabled';
    case 'denied':
      return 'Permission denied';
    default:
      return 'Not available';
  }
}
