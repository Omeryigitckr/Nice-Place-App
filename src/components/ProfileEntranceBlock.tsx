import { ReactNode } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

import { useEntrance } from '../motion';
import { motion } from '../theme/motion';

interface ProfileEntranceBlockProps {
  /** Stagger order: header 0, stats 1, actions 2, tabs 3, grid 4… */
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Short premium entrance: fade + slight rise. Backed by the shared motion system. */
export function ProfileEntranceBlock({ index, children, style }: ProfileEntranceBlockProps) {
  const { animatedStyle } = useEntrance({
    index,
    translateY: motion.translate.sectionY,
    durationMs: motion.duration.normal,
    staggerStep: motion.stagger.step,
    baseDelay: motion.stagger.baseDelay,
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
