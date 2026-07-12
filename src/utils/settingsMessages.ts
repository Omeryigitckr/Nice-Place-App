import { i18n } from '../i18n/instance';
import type { PermissionState } from '../services/appPermissionsService';
import type { LegalInfoContent } from '../components/LegalInfoModal';

export const DELETE_ACCOUNT_CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export const SUPPORT_EMAIL = 'support@niceplace.site';

const PERMISSION_STATUS_KEYS: Record<PermissionState, string> = {
  granted: 'settings.permissionStatus.granted',
  denied: 'settings.permissionStatus.denied',
  blocked: 'settings.permissionStatus.blocked',
  undetermined: 'settings.permissionStatus.undetermined',
  unavailable: 'settings.permissionStatus.unavailable',
};

/**
 * Localizes settings / account-deletion service messages.
 */
export function localizeSettingsMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  if (
    message.startsWith('settings.') ||
    message.startsWith('notifications.') ||
    message.startsWith('profile.') ||
    message.startsWith('auth.') ||
    message.startsWith('errors.') ||
    message.startsWith('common.') ||
    message.startsWith('network.') ||
    message.startsWith('permissions.') ||
    message.startsWith('map.')
  ) {
    return i18n.t(message as never);
  }

  return message;
}

export function getPermissionStatusLabel(state: PermissionState): string {
  const key = PERMISSION_STATUS_KEYS[state] ?? 'settings.permissionStatus.unavailable';
  return i18n.t(key as never);
}

export type LegalContentId = 'about' | 'terms' | 'privacy' | 'guidelines';

export function getLegalContent(id: LegalContentId): LegalInfoContent {
  const supportContact = i18n.t('settings.legal.supportContact');
  return {
    title: i18n.t(`settings.legal.${id}.title` as never),
    body: i18n.t(`settings.legal.${id}.body` as never, {
      supportContact,
      supportEmail: SUPPORT_EMAIL,
    }),
  };
}
