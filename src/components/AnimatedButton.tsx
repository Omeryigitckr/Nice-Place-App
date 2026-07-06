import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { usePressScale } from '../motion';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

interface AnimatedButtonProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Defaults to `motion.scale.press` (0.97). */
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
}

/**
 * Reusable pressable with standardized scale feedback.
 * Presentation only — no business logic.
 */
export function AnimatedButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  pressScale = motion.scale.press,
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityRole = 'button',
}: AnimatedButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    pressedScale: pressScale,
    disabled: isDisabled,
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[styles.content, contentStyle, isDisabled && styles.disabled]}
      >
        {loading ? <ActivityIndicator color={colors.primary} /> : children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
