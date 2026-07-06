import { ReactNode } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { useEntrance } from '../motion';
import { motion } from '../theme/motion';

interface AnimatedScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Disable entrance (e.g. when parent already animates). */
  animate?: boolean;
}

/**
 * Lightweight screen/section entrance: fade + subtle translateY.
 * Compose inside ScreenContainer; does not own safe-area or scrolling.
 */
export function AnimatedScreen({
  children,
  style,
  animate = true,
}: AnimatedScreenProps) {
  const { animatedStyle } = useEntrance({
    index: 0,
    translateY: motion.translate.screenY,
    durationMs: motion.duration.slow,
    baseDelay: 0,
    enabled: animate,
  });

  return <Animated.View style={[styles.root, animatedStyle, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
  },
});
