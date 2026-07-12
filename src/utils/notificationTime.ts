import { i18n } from '../i18n/instance';
import type { SupportedLanguage } from '../i18n/types';
import { isSupportedLanguage } from '../i18n/types';

const LOCALE_TAGS: Record<SupportedLanguage, string> = {
  tr: 'tr-TR',
  en: 'en',
  es: 'es-ES',
  de: 'de-DE',
  ru: 'ru-RU',
};

function resolveLanguage(): SupportedLanguage {
  const code = i18n.language?.split('-')[0] ?? 'en';
  return isSupportedLanguage(code) ? code : 'en';
}

export function getNotificationLocaleTag(language?: string): string {
  const code = (language ?? i18n.language)?.split('-')[0] ?? 'en';
  const supported = isSupportedLanguage(code) ? code : resolveLanguage();
  return LOCALE_TAGS[supported];
}

/**
 * Relative labels for recent timestamps; absolute locale string for older ones.
 * Re-evaluates from current i18n language (call at render time).
 */
export function formatNotificationTime(iso: string, language?: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = Date.now();
    const diffMs = now - date.getTime();
    if (diffMs < 0) {
      return formatAbsolute(date, language);
    }

    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) {
      return i18n.t('notifications.time.justNow');
    }
    if (diffMin < 60) {
      return i18n.t('notifications.time.minutesAgo', { count: diffMin });
    }

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return i18n.t('notifications.time.hoursAgo', { count: diffHours });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    if (date >= startOfYesterday && date < startOfToday) {
      return i18n.t('notifications.time.yesterday');
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return i18n.t('notifications.time.daysAgo', { count: diffDays });
    }

    return formatAbsolute(date, language);
  } catch {
    return '';
  }
}

function formatAbsolute(date: Date, language?: string): string {
  return date.toLocaleString(getNotificationLocaleTag(language), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
