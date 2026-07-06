import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingState({
  message,
  size = 'large',
  fullScreen = true,
}: LoadingStateProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        fullScreen && { backgroundColor: colors.background },
      ]}
    >
      <ActivityIndicator color={colors.primary} size={size} />
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
