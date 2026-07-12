/**
 * Supported app languages and related type helpers.
 * Keep this file free of i18next imports to avoid circular dependencies.
 */

export const LANGUAGE_STORAGE_KEY = 'niceplace_language' as const;

export const FALLBACK_LANGUAGE = 'en' as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish' },
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export type SupportedLanguageMeta = (typeof SUPPORTED_LANGUAGES)[number];

const SUPPORTED_LANGUAGE_CODES: readonly SupportedLanguage[] =
  SUPPORTED_LANGUAGES.map((language) => language.code);

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value);
}

const LANGUAGE_META_BY_CODE: Record<SupportedLanguage, SupportedLanguageMeta> =
  SUPPORTED_LANGUAGES.reduce(
    (acc, language) => {
      acc[language.code] = language;
      return acc;
    },
    {} as Record<SupportedLanguage, SupportedLanguageMeta>,
  );

export function getLanguageMeta(
  code: SupportedLanguage,
): SupportedLanguageMeta {
  return LANGUAGE_META_BY_CODE[code];
}
