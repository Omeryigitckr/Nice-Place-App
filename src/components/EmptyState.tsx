import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { duration, iconSizes, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const calmEasing = Easing.out(Easing.cubic);

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
          ...shadows.sm,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.primaryBorder,
          },
        ]}
      >
        <Ionicons name={icon} size={iconSizes.xl} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.screenTitle,
    textAlign: 'center',
  },
  description: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
