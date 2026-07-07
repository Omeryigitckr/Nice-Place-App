import AsyncStorage from '@react-native-async-storage/async-storage';
import { devLog, devWarn } from '../utils/devLog';

export type ThemeMode = 'system' | 'light' | 'dark';
export type MapStylePreference = 'standard' | 'satellite' | 'outdoors';
export type DistanceUnit = 'km' | 'mi';

export interface NotificationPreferences {
  updateRequestStatus: boolean;
  newNearbyPlaces: boolean;
  savedPlaceReminders: boolean;
}

export interface AppSettings {
  themeMode: ThemeMode;
  mapStyle: MapStylePreference;
  distanceUnit: DistanceUnit;
  notifications: NotificationPreferences;
}

export const SETTINGS_KEYS = {
  preferences: '@nice_place/app_preferences',
  onboardingComplete: '@nice_place/onboarding_complete',
  savedPlaceIds: '@nice_place/saved_place_ids',
} as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'dark',
  mapStyle: 'outdoors',
  distanceUnit: 'km',
  notifications: {
    updateRequestStatus: false,
    newNearbyPlaces: false,
    savedPlaceReminders: false,
  },
};

type SettingsListener = (settings: AppSettings) => void;

const listeners = new Set<SettingsListener>();
let cachedSettings: AppSettings | null = null;

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isMapStyle(value: unknown): value is MapStylePreference {
  return value === 'standard' || value === 'satellite' || value === 'outdoors';
}

function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === 'km' || value === 'mi';
}

function parseSettings(raw: string | null): AppSettings {
  if (!raw) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as {
      themeMode?: unknown;
      mapStyle?: unknown;
      distanceUnit?: unknown;
      notifications?: {
        updateRequestStatus?: boolean;
        reviewStatusUpdates?: boolean;
        newNearbyPlaces?: boolean;
        newPlacesNearby?: boolean;
        savedPlaceReminders?: boolean;
        savedPlaceUpdates?: boolean;
      };
    };

    const notifications = parsed.notifications ?? {};

    return {
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : DEFAULT_APP_SETTINGS.themeMode,
      mapStyle: isMapStyle(parsed.mapStyle) ? parsed.mapStyle : DEFAULT_APP_SETTINGS.mapStyle,
      distanceUnit: isDistanceUnit(parsed.distanceUnit)
        ? parsed.distanceUnit
        : DEFAULT_APP_SETTINGS.distanceUnit,
      notifications: {
        updateRequestStatus:
          notifications.updateRequestStatus ??
          notifications.reviewStatusUpdates ??
          DEFAULT_APP_SETTINGS.notifications.updateRequestStatus,
        newNearbyPlaces:
          notifications.newNearbyPlaces ??
          notifications.newPlacesNearby ??
          DEFAULT_APP_SETTINGS.notifications.newNearbyPlaces,
        savedPlaceReminders:
          notifications.savedPlaceReminders ??
          notifications.savedPlaceUpdates ??
          DEFAULT_APP_SETTINGS.notifications.savedPlaceReminders,
      },
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function notifyListeners(settings: AppSettings) {
  cachedSettings = settings;
  listeners.forEach((listener) => listener(settings));
}

export function subscribeAppSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  if (cachedSettings) {
    listener(cachedSettings);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getCachedAppSettings(): AppSettings {
  return cachedSettings ?? DEFAULT_APP_SETTINGS;
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEYS.preferences);
    const settings = parseSettings(raw);
    notifyListeners(settings);
    devLog('[Nice Place Settings] loaded', settings);
    return settings;
  } catch (error: unknown) {
    devWarn('[Nice Place Settings] load failed:', error);
    notifyListeners(DEFAULT_APP_SETTINGS);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEYS.preferences, JSON.stringify(settings));
    notifyListeners(settings);
    devLog('[Nice Place Settings] saved', settings);
  } catch (error: unknown) {
    devWarn('[Nice Place Settings] save failed:', error);
    throw error;
  }
}

export async function resetAppSettings(): Promise<AppSettings> {
  await saveAppSettings(DEFAULT_APP_SETTINGS);
  devLog('[Nice Place Settings] reset');
  return DEFAULT_APP_SETTINGS;
}

/** Clears local cache keys without removing onboarding or auth session. */
export async function clearLocalCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SETTINGS_KEYS.savedPlaceIds]);
    devLog('[Nice Place Settings] clear cache');
  } catch (error: unknown) {
    devWarn('[Nice Place Settings] clear cache failed:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Legacy exports used by older settings screens / utils
// ---------------------------------------------------------------------------

export type AppPreferences = AppSettings;
export const DEFAULT_APP_PREFERENCES = DEFAULT_APP_SETTINGS;

export async function loadAppPreferences(): Promise<AppSettings> {
  return loadAppSettings();
}

export async function saveAppPreferences(preferences: AppSettings): Promise<void> {
  return saveAppSettings(preferences);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required.';
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters.';
  }
  if (username.length > 30) {
    return 'Username must be 30 characters or fewer.';
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Use only lowercase letters, numbers, and underscores.';
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return 'Display name is required.';
  }
  if (trimmed.length > 60) {
    return 'Display name must be 60 characters or fewer.';
  }
  return null;
}

export function validateBio(bio: string): string | null {
  if (bio.trim().length > 240) {
    return 'Bio must be 240 characters or fewer.';
  }
  return null;
}
