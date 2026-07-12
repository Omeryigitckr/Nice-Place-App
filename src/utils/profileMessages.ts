import { PROFILE_REPORTS_DAILY_LIMIT } from '../constants/profileModeration';
import { i18n } from '../i18n/instance';

/**
 * Localizes profile / avatar / report / validation service messages.
 * Prefer storing translation keys in state; English leftovers map as a fallback.
 */
export function localizeProfileMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  if (
    message.startsWith('profile.') ||
    message.startsWith('explore.') ||
    message.startsWith('saved.') ||
    message.startsWith('errors.') ||
    message.startsWith('auth.') ||
    message.startsWith('common.') ||
    message.startsWith('network.') ||
    message.startsWith('permissions.') ||
    message.startsWith('addPlace.') ||
    message.startsWith('navigation.')
  ) {
    if (message === 'profile.report.errors.daily_limit') {
      return i18n.t(message, { limit: PROFILE_REPORTS_DAILY_LIMIT });
    }
    return i18n.t(message as never);
  }

  return message;
}

export function localizeReportError(errorCode?: string | null, fallbackMessage?: string | null): string {
  const codeKey = errorCode ? `profile.report.errors.${errorCode}` : null;
  if (codeKey && i18n.exists(codeKey)) {
    return localizeProfileMessage(codeKey) ?? i18n.t('profile.report.errors.generic');
  }

  if (errorCode === 'username_taken') {
    return i18n.t('profile.errors.usernameTaken');
  }
  if (errorCode === 'invalid_username') {
    return i18n.t('profile.moderation.usernameReset.invalid');
  }
  if (errorCode === 'not_configured') {
    return i18n.t('auth.errors.configMissing');
  }

  const localizedFallback = localizeProfileMessage(fallbackMessage);
  if (localizedFallback) {
    return localizedFallback;
  }

  return i18n.t('profile.report.errors.generic');
}

export function profileMessageKey(key: string): string {
  return key;
}
