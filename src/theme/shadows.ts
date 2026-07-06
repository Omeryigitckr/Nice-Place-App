import { Platform, ViewStyle } from 'react-native';

import { colors } from './colors';

type ShadowPreset = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function iosShadow(
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ShadowPreset {
  return Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: { elevation },
  }) as ShadowPreset;
}

export const shadows = {
  none: {} satisfies ShadowPreset,
  sm: iosShadow(2, 0.12, 6, 3),
  md: iosShadow(6, 0.18, 12, 6),
  lg: iosShadow(10, 0.24, 18, 10),
  glass: iosShadow(8, 0.22, 16, 8),
  /** @deprecated Use md or glass */
  card: iosShadow(4, 0.18, 14, 5),
  /** @deprecated Use glass */
  tabBar: iosShadow(8, 0.22, 16, 12),
  /** @deprecated Use glass */
  fab: iosShadow(4, 0.28, 10, 8),
} as const;

export type ShadowKey = keyof typeof shadows;
