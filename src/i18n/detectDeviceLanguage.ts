import { getLocales } from 'expo-localization';

import {
  FALLBACK_LANGUAGE,
  isSupportedLanguage,
  SupportedLanguage,
} from './types';

/**
 * Resolves the best supported language from the device locale list.
 * Unsupported device languages fall back to English.
 */
export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locales = getLocales();

    for (const locale of locales) {
      const languageCode = locale.languageCode;
      if (languageCode && isSupportedLanguage(languageCode)) {
        return languageCode;
      }
    }
  } catch {
    // Native module unavailable (tests / unexpected runtime) → fallback.
  }

  return FALLBACK_LANGUAGE;
}
