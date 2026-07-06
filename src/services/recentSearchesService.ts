import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nice_place/recent_searches';
const MAX_RECENT = 8;

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const normalized = query.trim();
  if (!normalized) {
    return loadRecentSearches();
  }

  const existing = await loadRecentSearches();
  const next = [
    normalized,
    ...existing.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, MAX_RECENT);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeRecentSearch(query: string): Promise<string[]> {
  const existing = await loadRecentSearches();
  const next = existing.filter((item) => item.toLowerCase() !== query.trim().toLowerCase());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
