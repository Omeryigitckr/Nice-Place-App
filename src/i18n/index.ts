/**
 * Localization entry point.
 *
 * Usage:
 * - Wrap the app with `I18nProvider` (see App.tsx)
 * - Use `useTranslation()` from react-i18next in components
 * - Use `useAppLanguage()` / `changeAppLanguage()` to switch languages
 *
 * Key convention: namespace.feature.element (e.g. `common.save`, `auth.login.title`)
 * Never use full English sentences as keys.
 */

export {
  changeAppLanguage,
  getCurrentLanguage,
  i18n,
  initI18n,
  resolveInitialLanguage,
  resources,
} from './instance';
export type { AppTranslationResources } from './instance';

export { I18nProvider, useAppLanguage } from './I18nProvider';

export { detectDeviceLanguage } from './detectDeviceLanguage';
export { getStoredLanguage, setStoredLanguage } from './languageStorage';

export {
  FALLBACK_LANGUAGE,
  getLanguageMeta,
  isSupportedLanguage,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from './types';
export type { SupportedLanguage, SupportedLanguageMeta } from './types';
