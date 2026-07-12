import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isSupportedLanguage,
  LANGUAGE_STORAGE_KEY,
  SupportedLanguage,
} from './types';

/**
 * Reads the persisted language preference.
 * Returns null when unset or when stored value is not a supported language.
 */
export async function getStoredLanguage(): Promise<SupportedLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists an explicit user language preference.
 * Does not clear other app settings or session data.
 */
export async function setStoredLanguage(
  language: SupportedLanguage,
): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
