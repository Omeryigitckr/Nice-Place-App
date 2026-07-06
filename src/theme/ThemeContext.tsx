import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { devLog } from '../utils/devLog';

import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  subscribeAppSettings,
  ThemeMode,
} from '../services/settingsService';
import { setDistanceUnitPreference } from '../utils/distance';

import { AppColorPalette, getPalette } from './palettes';
import { getThemeShadows, ThemeShadows } from './themeShadows';

export type ResolvedColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ThemeMode;
  colorScheme: ResolvedColorScheme;
  colors: AppColorPalette;
  shadows: ThemeShadows;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: DEFAULT_APP_SETTINGS.themeMode,
  colorScheme: 'dark',
  colors: getPalette('dark'),
  shadows: getThemeShadows(getPalette('dark'), 'dark'),
});

function resolveColorScheme(
  themeMode: ThemeMode,
  system: ColorSchemeName,
): ResolvedColorScheme {
  if (themeMode === 'system') {
    return system === 'light' ? 'light' : 'dark';
  }
  return themeMode;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
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

  const colors = useMemo(() => getPalette(colorScheme), [colorScheme]);
  const shadows = useMemo(() => getThemeShadows(colors, colorScheme), [colors, colorScheme]);

  useEffect(() => {
    devLog('[Nice Place Theme] applied:', colorScheme, '(mode:', settings.themeMode + ')');
  }, [colorScheme, settings.themeMode]);

  const value = useMemo(
    () => ({
      themeMode: settings.themeMode,
      colorScheme,
      colors,
      shadows,
    }),
    [settings.themeMode, colorScheme, colors, shadows],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ExpoStatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useThemeColors(): AppColorPalette {
  return useContext(ThemeContext).colors;
}
