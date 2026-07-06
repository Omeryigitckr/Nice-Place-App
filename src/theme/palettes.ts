import { colors as darkPalette } from './colors';

export type AppColorPalette = { [K in keyof typeof darkPalette]: string };

export const darkColors: AppColorPalette = { ...darkPalette };

/**
 * Intentional light mode palette — clean Apple-style outdoor UI.
 * Map overlay components should keep using darkColors.
 */
export const lightColors: AppColorPalette = {
  ...darkPalette,

  background: '#F7F8FA',
  backgroundSecondary: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  card: '#FFFFFF',
  input: '#EEF2F6',

  primary: '#44A878',
  primaryDark: '#2F7A58',
  primaryLight: 'rgba(68, 168, 120, 0.12)',
  accent: '#E8A04A',
  accentLight: 'rgba(232, 160, 74, 0.12)',

  text: '#111827',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#6B7280',
  textInverse: '#F7F8FA',

  border: '#E5E7EB',
  borderLight: '#E5E7EB',
  cardShadow: '#0F172A',
  shadow: '#0F172A',

  success: '#44A878',
  warning: '#E8A04A',
  error: '#E86A6A',
  danger: '#E86A6A',

  chipBackground: '#EEF2F6',
  chipActiveBackground: 'rgba(68, 168, 120, 0.14)',
  tabBarBackground: '#FFFFFF',

  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  glassBorder: '#E5E7EB',
  glassHighlight: 'rgba(15, 23, 42, 0.03)',

  overlay: 'rgba(247, 248, 250, 0.94)',
  scrim: 'rgba(17, 24, 39, 0.28)',
  scrimHeavy: 'rgba(17, 24, 39, 0.42)',

  tabBarBorder: '#E5E7EB',
  tabActive: '#44A878',
  tabInactive: '#334155',
  tabAddBackground: '#44A878',
  tabAddIcon: '#FFFFFF',

  chipActive: 'rgba(68, 168, 120, 0.14)',
  chipInactive: '#EEF2F6',

  primaryMuted: '#2F7A58',
  primaryBorder: 'rgba(68, 168, 120, 0.28)',
  primaryBorderStrong: 'rgba(68, 168, 120, 0.45)',
  tabBar: '#FFFFFF',
  tabBarActive: '#44A878',
  tabBarInactive: '#334155',
  borderSubtle: '#E5E7EB',
  glassBorderSubtle: '#E5E7EB',
  inset: '#EEF2F6',
  insetLight: '#F1F5F9',
  scrimDark: 'rgba(17, 24, 39, 0.5)',
  mapTopScrim: 'rgba(247, 248, 250, 0.2)',
  backgroundGradientEnd: '#F5F7FA',
  surfaceHighlight: '#FFFFFF',
  accentMuted: 'rgba(232, 160, 74, 0.12)',
  accentBorder: 'rgba(232, 160, 74, 0.4)',
  mapGrid: 'rgba(15, 23, 42, 0.04)',
  mapRoad: 'rgba(15, 23, 42, 0.08)',
};

export function getPalette(scheme: 'light' | 'dark'): AppColorPalette {
  return scheme === 'light' ? lightColors : darkColors;
}
