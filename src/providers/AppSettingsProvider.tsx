import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, StatusBar, useColorScheme } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  subscribeAppSettings,
} from '../services/settingsService';
import { setDistanceUnitPreference } from '../utils/distance';

interface AppSettingsProviderProps {
  children: ReactNode;
}

function resolveColorScheme(themeMode: AppSettings['themeMode'], system: ColorSchemeName): 'light' | 'dark' {
  if (themeMode === 'system') {
    return system === 'light' ? 'light' : 'dark';
  }
  return themeMode;
}

export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    void loadAppSettings().then((next) => {
      setDistanceUnitPreference(next.distanceUnit);
      setSettings(next);
    });

    return subscribeAppSettings((next) => {
      setDistanceUnitPreference(next.distanceUnit);
      setSettings(next);
    });
  }, []);

  const colorScheme = useMemo(
    () => resolveColorScheme(settings.themeMode, systemScheme),
    [settings.themeMode, systemScheme],
  );

  return (
    <>
      <ExpoStatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <StatusBar barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'} />
      {children}
    </>
  );
}
