import { getNetworkStatus } from '../network';
import { i18n } from '../i18n/instance';

export function getOfflineUserMessage(): string {
  return i18n.t('network.offline');
}

function isLikelyNetworkMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('network request failed') ||
    normalized.includes('network error') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('connection') ||
    normalized.includes('offline') ||
    normalized.includes('internet') ||
    normalized.includes('econnrefused') ||
    normalized.includes('enotfound') ||
    normalized.includes('socket')
  );
}

export function isOfflineOrNetworkError(error?: string | null): boolean {
  if (getNetworkStatus().isOffline) {
    return true;
  }
  if (!error) {
    return false;
  }
  return isLikelyNetworkMessage(error);
}

export function toUserFacingNetworkError(error?: string | null): string {
  if (isOfflineOrNetworkError(error)) {
    return i18n.t('network.offline');
  }
  const trimmed = error?.trim();
  if (
    trimmed &&
    (trimmed.startsWith('auth.') ||
      trimmed.startsWith('place.') ||
      trimmed.startsWith('errors.') ||
      trimmed.startsWith('network.') ||
      trimmed.startsWith('common.') ||
      trimmed.startsWith('settings.') ||
      trimmed.startsWith('placeForm.') ||
      trimmed.startsWith('admin.'))
  ) {
    return String(i18n.t(trimmed as never));
  }
  return trimmed || i18n.t('errors.generic');
}
