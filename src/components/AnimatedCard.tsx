import { ReactNode } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { useEntrance, usePressScale } from '../motion';
import { motion } from '../theme/motion';
import { radius, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface AnimatedCardProps {
  children: ReactNode;
  onPress?: () => void;
  /** When set, plays a staggered entrance. */
  entranceIndex?: number;
  elevated?: boolean;
  padded?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Theme-safe card with optional press feedback and entrance animation.
 * Suitable for place, profile, saved, and liked cards.
 */
export function AnimatedCard({
  children,
  onPress,
  entranceIndex,
  elevated = false,
  padded = true,
  disabled = false,
  style,
  accessibilityLabel,
}: AnimatedCardProps) {
  const { colors, shadows } = useTheme();
  const { onPressIn, onPressOut, animatedStyle: pressStyle } = usePressScale({
    pressedScale: motion.scale.cardPress,
    disabled: disabled || !onPress,
  });
  const { animatedStyle: entranceStyle } = useEntrance({
    index: entranceIndex ?? 0,
    translateY: motion.translate.listItemY,
    enabled: entranceIndex != null,
  });

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      ...(elevated ? shadows.card : shadows.sm),
    },
    padded && styles.padded,
    style,
  ];

  const content = onPress ? (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={cardStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  ) : (
    <Animated.View style={cardStyle}>{children}</Animated.View>
  );

  if (entranceIndex == null) {
    return content;
  }

  return <Animated.View style={entranceStyle}>{content}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  padded: {
    padding: spacing.md,
  },
});
