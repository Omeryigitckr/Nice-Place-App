import { useCallback, useEffect, useState } from 'react';
import { devLog } from '../utils/devLog';

import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  resetAppSettings,
  clearLocalCache,
  subscribeAppSettings,
} from '../services/settingsService';
import { setDistanceUnitPreference } from '../utils/distance';

interface UseAppSettingsResult {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updater: (current: AppSettings) => AppSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  clearCache: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const next = await loadAppSettings();
    setDistanceUnitPreference(next.distanceUnit);
    setSettings(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return subscribeAppSettings((next) => {
      setDistanceUnitPreference(next.distanceUnit);
      setSettings(next);
      setLoading(false);
    });
  }, [reload]);

  const updateSettings = useCallback(async (updater: (current: AppSettings) => AppSettings) => {
    const current = settings;
    const next = updater(current);
    if (next.themeMode !== current.themeMode) {
      devLog('[Nice Place Settings] theme changed:', next.themeMode);
    }
    setSettings(next);
    setDistanceUnitPreference(next.distanceUnit);
    await saveAppSettings(next);
  }, [settings]);

  const resetSettings = useCallback(async () => {
    const next = await resetAppSettings();
    setDistanceUnitPreference(next.distanceUnit);
    setSettings(next);
  }, []);

  const clearCache = useCallback(async () => {
    await clearLocalCache();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    resetSettings,
    clearCache,
    reload,
  };
}
