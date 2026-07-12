import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { detectDeviceLanguage } from './detectDeviceLanguage';
import { getStoredLanguage, setStoredLanguage } from './languageStorage';
import de from './resources/de.json';
import en from './resources/en.json';
import es from './resources/es.json';
import ru from './resources/ru.json';
import tr from './resources/tr.json';
import {
  FALLBACK_LANGUAGE,
  isSupportedLanguage,
  SupportedLanguage,
} from './types';

export const resources = {
  tr: { translation: tr },
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  ru: { translation: ru },
} as const;

export type AppTranslationResources = typeof en;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: AppTranslationResources;
    };
  }
}

let initPromise: Promise<typeof i18n> | null = null;

/**
 * Resolves the language for this launch:
 * 1. Persisted preference (if valid)
 * 2. Device language (if supported)
 * 3. English fallback
 *
 * Does not write to storage — preference is only saved when language is
 * changed deliberately via `changeAppLanguage`.
 */
export async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  const stored = await getStoredLanguage();
  if (stored) {
    return stored;
  }
  return detectDeviceLanguage();
}

async function bootstrapI18n(language: SupportedLanguage): Promise<typeof i18n> {
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: ['tr', 'en', 'es', 'de', 'ru'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
    returnNull: false,
  });

  return i18n;
}

/**
 * Initializes i18next once. Safe to call multiple times — subsequent calls
 * await the same in-flight / completed promise.
 * On storage/locale failures, falls back to English rather than blocking the app.
 */
export function initI18n(): Promise<typeof i18n> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (i18n.isInitialized) {
      return i18n;
    }

    let language: SupportedLanguage = FALLBACK_LANGUAGE;
    try {
      language = await resolveInitialLanguage();
    } catch {
      language = FALLBACK_LANGUAGE;
    }

    try {
      return await bootstrapI18n(language);
    } catch {
      if (i18n.isInitialized) {
        return i18n;
      }
      return bootstrapI18n(FALLBACK_LANGUAGE);
    }
  })();

  return initPromise;
}

/**
 * Changes language immediately and persists the preference.
 * Serializes concurrent calls so rapid taps cannot race AsyncStorage writes.
 * Safe to call after `initI18n` has completed.
 */
let languageChangeQueue: Promise<void> = Promise.resolve();

export async function changeAppLanguage(
  language: SupportedLanguage,
): Promise<void> {
  if (!isSupportedLanguage(language)) {
    return;
  }

  const run = async () => {
    await initI18n();
    if (getCurrentLanguage() === language && i18n.language === language) {
      await setStoredLanguage(language);
      return;
    }
    await i18n.changeLanguage(language);
    await setStoredLanguage(language);
  };

  const next = languageChangeQueue.then(run, run);
  languageChangeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  await next;
}

/**
 * Current language as a supported code, falling back to English if unknown.
 */
export function getCurrentLanguage(): SupportedLanguage {
  const code = i18n.resolvedLanguage ?? i18n.language;
  if (code && isSupportedLanguage(code)) {
    return code;
  }
  return FALLBACK_LANGUAGE;
}

export { i18n };
