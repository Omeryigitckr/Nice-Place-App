/**
 * Nice Place semantic color tokens — premium dark outdoor palette (default).
 * Prefer these names over raw hex/rgba in screens and components.
 * Light mode overrides live in palettes.ts.
 */
export const colors = {
  background: '#060A10',
  backgroundSecondary: '#0C1119',
  surface: '#111820',
  surfaceElevated: '#1F2A3A',
  surfaceSecondary: '#182230',
  card: '#111820',
  input: '#182230',

  primary: '#44A878',
  primaryDark: '#2F7A58',
  primaryLight: 'rgba(68, 168, 120, 0.15)',
  accent: '#E8A04A',
  accentLight: 'rgba(232, 160, 74, 0.15)',

  text: '#F4F7FB',
  textPrimary: '#F4F7FB',
  textSecondary: '#9BA8BC',
  textMuted: '#6E7D93',
  textInverse: '#0C1119',

  border: '#273243',
  borderLight: '#334155',
  cardShadow: '#000000',
  shadow: '#000000',

  success: '#44A878',
  warning: '#E8A04A',
  error: '#E86A6A',
  danger: '#E86A6A',

  chipBackground: '#182230',
  chipActiveBackground: 'rgba(68, 168, 120, 0.18)',
  tabBarBackground: 'rgba(12, 18, 26, 0.84)',

  glass: 'rgba(12, 18, 26, 0.82)',
  glassStrong: 'rgba(8, 12, 18, 0.92)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',

  overlay: 'rgba(6, 10, 16, 0.90)',
  scrim: 'rgba(6, 10, 16, 0.55)',
  scrimHeavy: 'rgba(6, 10, 16, 0.72)',

  marker: '#44A878',
  markerSelected: '#E8A04A',

  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabActive: '#44A878',
  tabInactive: '#6E7D93',
  tabAddBackground: '#44A878',
  tabAddIcon: '#FFFFFF',

  chipActive: 'rgba(68, 168, 120, 0.18)',
  chipInactive: '#182230',

  white: '#FFFFFF',
  black: '#000000',

  /** @deprecated Use primaryDark */
  primaryMuted: '#2F7A58',
  /** @deprecated Use primaryLight + border tokens */
  primaryBorder: 'rgba(68, 168, 120, 0.28)',
  /** @deprecated Use primaryLight + border tokens */
  primaryBorderStrong: 'rgba(68, 168, 120, 0.48)',
  /** @deprecated Use tabBarBackground */
  tabBar: 'rgba(12, 18, 26, 0.84)',
  /** @deprecated Use tabActive */
  tabBarActive: '#44A878',
  /** @deprecated Use tabInactive */
  tabBarInactive: '#6E7D93',
  /** @deprecated Use borderLight */
  borderSubtle: '#334155',
  /** @deprecated Use glassHighlight */
  glassBorderSubtle: 'rgba(255, 255, 255, 0.05)',
  /** @deprecated Use overlay variants */
  inset: 'rgba(6, 10, 16, 0.45)',
  /** @deprecated Use overlay variants */
  insetLight: 'rgba(6, 10, 16, 0.32)',
  /** @deprecated Use overlay */
  scrimDark: 'rgba(6, 10, 16, 0.92)',
  /** @deprecated Map overlay token */
  mapTopScrim: 'rgba(6, 10, 16, 0.42)',
  /** @deprecated Use backgroundSecondary */
  backgroundGradientEnd: '#0C1119',
  /** @deprecated Use surfaceElevated */
  surfaceHighlight: '#1F2A3A',
  /** @deprecated Use accentLight */
  accentMuted: 'rgba(232, 160, 74, 0.15)',
  /** @deprecated Use accent + border */
  accentBorder: 'rgba(232, 160, 74, 0.5)',
  /** Map mock tokens — used by PlaceMapView */
  mapGrid: 'rgba(255, 255, 255, 0.04)',
  mapRoad: 'rgba(255, 255, 255, 0.08)',
} as const;

export type ColorKey = keyof typeof colors;
