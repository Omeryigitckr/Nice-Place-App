import { ReactNode } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

import { usePressScale } from '../motion';
import { motion } from '../theme/motion';

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Defaults to `motion.scale.press`. Use `motion.scale.cardPress` for cards. */
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
}

/** Lightweight press scale feedback (native driver). */
export function PressableScale({
  children,
  onPress,
  disabled = false,
  pressScale = motion.scale.press,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: PressableScaleProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    pressedScale: pressScale,
    disabled: disabled || !onPress,
  });

  if (!onPress) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
