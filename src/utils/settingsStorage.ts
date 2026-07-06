/** @deprecated Prefer importing from services/settingsService */
export {
  DEFAULT_APP_SETTINGS as DEFAULT_APP_PREFERENCES,
  DEFAULT_APP_SETTINGS,
  loadAppSettings as loadAppPreferences,
  saveAppSettings as saveAppPreferences,
  loadAppSettings,
  saveAppSettings,
  resetAppSettings,
  clearLocalCache,
  subscribeAppSettings,
  getCachedAppSettings,
  SETTINGS_KEYS,
  normalizeUsername,
  validateUsername,
  validateDisplayName,
  validateBio,
} from '../services/settingsService';

export type {
  AppSettings,
  AppSettings as AppPreferences,
  ThemeMode,
  MapStylePreference,
  DistanceUnit,
  NotificationPreferences,
} from '../services/settingsService';
