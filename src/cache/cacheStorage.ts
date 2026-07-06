import AsyncStorage from '@react-native-async-storage/async-storage';
import { devWarn } from '../utils/devLog';

export interface CacheEntry<T> {
  data: T;
  savedAt: number;
  expiresAt: number;
}

export interface ReadCacheOptions {
  /** When true, return data even if past expiresAt (offline fallback). */
  allowExpired?: boolean;
}

/**
 * Reusable AsyncStorage cache with optional TTL.
 * Writes are safe and non-blocking when using setCacheAsync.
 */
export async function getCache<T>(
  key: string,
  options?: ReadCacheOptions,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry !== 'object' || entry.data === undefined) {
      return null;
    }

    const expired = typeof entry.expiresAt === 'number' && Date.now() > entry.expiresAt;
    if (expired && !options?.allowExpired) {
      return null;
    }

    return entry.data;
  } catch (error: unknown) {
    devWarn('[Nice Place Cache] read failed:', key, error);
    return null;
  }
}

export async function getCacheEntry<T>(
  key: string,
): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry !== 'object' || entry.data === undefined) {
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttlMs: number,
): Promise<void> {
  try {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      savedAt: now,
      expiresAt: now + Math.max(0, ttlMs),
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error: unknown) {
    devWarn('[Nice Place Cache] write failed:', key, error);
  }
}

/** Fire-and-forget write — never blocks the UI thread path. */
export function setCacheAsync<T>(key: string, data: T, ttlMs: number): void {
  void setCache(key, data, ttlMs);
}

export async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error: unknown) {
    devWarn('[Nice Place Cache] remove failed:', key, error);
  }
}

export function removeCacheAsync(key: string): void {
  void removeCache(key);
}
