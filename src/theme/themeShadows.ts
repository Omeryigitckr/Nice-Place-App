import { Platform, ViewStyle } from 'react-native';

import { AppColorPalette } from './palettes';

type ShadowPreset = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function shadow(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ShadowPreset {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: { elevation },
  }) as ShadowPreset;
}

export function getThemeShadows(colors: AppColorPalette, scheme: 'light' | 'dark') {
  const isLight = scheme === 'light';

  return {
    none: {} as ShadowPreset,
    sm: shadow(colors.cardShadow, isLight ? 1 : 2, isLight ? 0.06 : 0.12, isLight ? 4 : 6, isLight ? 1 : 3),
    md: shadow(colors.cardShadow, isLight ? 2 : 6, isLight ? 0.08 : 0.18, isLight ? 8 : 12, isLight ? 2 : 6),
    lg: shadow(colors.cardShadow, isLight ? 4 : 10, isLight ? 0.1 : 0.24, isLight ? 12 : 18, isLight ? 3 : 10),
    glass: shadow(colors.cardShadow, isLight ? 2 : 8, isLight ? 0.08 : 0.22, isLight ? 10 : 16, isLight ? 2 : 8),
    card: shadow(colors.cardShadow, isLight ? 1 : 4, isLight ? 0.06 : 0.18, isLight ? 8 : 14, isLight ? 2 : 5),
    tabBar: shadow(colors.cardShadow, isLight ? 2 : 8, isLight ? 0.08 : 0.22, isLight ? 10 : 16, isLight ? 3 : 12),
    fab: shadow(colors.cardShadow, isLight ? 2 : 4, isLight ? 0.1 : 0.28, isLight ? 8 : 10, isLight ? 3 : 8),
  };
}

export type ThemeShadows = ReturnType<typeof getThemeShadows>;
