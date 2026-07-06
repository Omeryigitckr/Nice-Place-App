import { Platform } from 'react-native';

import { colors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    ...typography.screenTitle,
    fontSize: 17,
  },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
  headerBackTitleVisible: Platform.OS === 'ios',
} as const;

export const tabHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
  headerTitleStyle: {
    ...typography.screenTitle,
    fontSize: 17,
  },
} as const;

export const tabBarOptions = {
  style: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  activeTintColor: colors.tabActive,
  inactiveTintColor: colors.tabInactive,
} as const;

export const floatingTabBarLayout = {
  height: 64,
  horizontalInset: spacing.lg,
  bottomOffset: spacing.md,
  borderRadius: radius.pill,
  backgroundColor: colors.tabBarBackground,
  borderColor: colors.tabBarBorder,
  shadow: shadows.glass,
} as const;

export const FLOATING_TAB_BAR_HEIGHT = floatingTabBarLayout.height;
export const FLOATING_TAB_BAR_BOTTOM_OFFSET = floatingTabBarLayout.bottomOffset;
export const FLOATING_TAB_BAR_EXTRA_SPACING = spacing.md;

/** Total vertical space reserved above the home indicator for floating tab content. */
export function getFloatingTabBarTotalSpace(
  safeAreaBottom: number,
  extraSpacing: number = FLOATING_TAB_BAR_EXTRA_SPACING,
): number {
  return (
    safeAreaBottom +
    FLOATING_TAB_BAR_BOTTOM_OFFSET +
    FLOATING_TAB_BAR_HEIGHT +
    extraSpacing
  );
}
