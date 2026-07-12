import { ReactElement, ReactNode } from 'react';
import { RefreshControlProps, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFloatingTabBarInset } from '../hooks';
import { useThemeColors } from '../theme/ThemeContext';
import { spacing } from '../theme';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  /** Reserve space for the floating glass tab bar on main tab screens. */
  reserveFloatingTabBar?: boolean;
  /** Soft keyboard inset handling for forms (avoids hard layout jumps). */
  keyboardAware?: boolean;
  /**
   * Extra space added on top of the safe-area top inset (or base top padding when
   * safeTop is false). Prefer this over setting paddingTop in contentStyle.
   */
  topExtra?: number;
  /**
   * Extra space added on top of the computed bottom padding.
   * Prefer this over setting paddingBottom in contentStyle when safe areas apply.
   */
  bottomExtra?: number;
  refreshControl?: ReactElement<RefreshControlProps>;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = false,
  padded = true,
  safeTop = true,
  safeBottom = true,
  reserveFloatingTabBar = false,
  keyboardAware = false,
  topExtra = 0,
  bottomExtra = 0,
  refreshControl,
  style,
  contentStyle,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useFloatingTabBarInset();
  const colors = useThemeColors();

  const topPadding = (safeTop ? insets.top + spacing.sm : spacing.md) + topExtra;

  const bottomPadding =
    (reserveFloatingTabBar
      ? tabBarInset.contentPaddingBottom
      : safeBottom
        ? insets.bottom + spacing.sm
        : spacing.md) + bottomExtra;

  // Safe-area padding is applied LAST so contentStyle cannot wipe notch / home-indicator insets.
  const resolvedContentStyle = [
    styles.container,
    {
      backgroundColor: colors.background,
    },
    padded && styles.padded,
    style,
    contentStyle,
    {
      paddingTop: topPadding,
      paddingBottom: bottomPadding,
    },
  ];

  if (scrollable) {
    return (
      <ScrollView
        contentContainerStyle={resolvedContentStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={keyboardAware}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        style={[styles.scroll, { backgroundColor: colors.background }]}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={resolvedContentStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
