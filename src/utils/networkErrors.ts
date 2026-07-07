import { getNetworkStatus } from '../network';

export const OFFLINE_USER_MESSAGE =
  'İnternet bağlantısı yok. Lütfen bağlantını kontrol edip tekrar dene.';

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
    return OFFLINE_USER_MESSAGE;
  }
  return error?.trim() || 'Bir şeyler ters gitti. Lütfen tekrar dene.';
}
