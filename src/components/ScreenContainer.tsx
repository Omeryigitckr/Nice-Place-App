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
  refreshControl,
  style,
  contentStyle,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useFloatingTabBarInset();
  const colors = useThemeColors();

  const bottomPadding = reserveFloatingTabBar
    ? tabBarInset.contentPaddingBottom
    : safeBottom
      ? insets.bottom + spacing.sm
      : spacing.md;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.background,
      paddingTop: safeTop ? insets.top + spacing.sm : spacing.md,
      paddingBottom: bottomPadding,
    },
    padded && styles.padded,
    style,
  ];

  // Apply tab-bar inset last so contentStyle cannot override paddingBottom.
  const resolvedContentStyle = [
    containerStyle,
    contentStyle,
    reserveFloatingTabBar ? { paddingBottom: bottomPadding } : null,
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
