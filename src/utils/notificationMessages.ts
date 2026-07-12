import { i18n } from '../i18n/instance';

/**
 * Localizes notification service / hook messages that return translation keys.
 */
export function localizeNotificationMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  if (
    message.startsWith('notifications.') ||
    message.startsWith('settings.') ||
    message.startsWith('errors.') ||
    message.startsWith('common.') ||
    message.startsWith('network.') ||
    message.startsWith('auth.')
  ) {
    return i18n.t(message as never);
  }

  return message;
}
