/**
 * Backward-compatible wrapper around useAppSettings for older settings screens.
 */
import { useAppSettings } from './useAppSettings';
import { AppSettings } from '../services/settingsService';

interface UseSettingsPreferencesResult {
  preferences: AppSettings;
  loading: boolean;
  updatePreferences: (updater: (current: AppSettings) => AppSettings) => Promise<void>;
  reload: () => Promise<void>;
}

export function useSettingsPreferences(): UseSettingsPreferencesResult {
  const { settings, loading, updateSettings, reload } = useAppSettings();

  return {
    preferences: settings,
    loading,
    updatePreferences: updateSettings,
    reload,
  };
}
