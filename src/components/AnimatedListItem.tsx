import { ReactNode } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

import { useEntrance } from '../motion';
import { motion } from '../theme/motion';

interface AnimatedListItemProps {
  children: ReactNode;
  /** List index for stagger. Items beyond `maxListItems` skip animation. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** Cap animated items for long lists (default: motion.stagger.maxListItems). */
  maxAnimatedItems?: number;
}

/**
 * Lightweight list/grid entrance. Only the first N items animate.
 * Safe for FlatList / long lists.
 */
export function AnimatedListItem({
  children,
  index = 0,
  style,
  maxAnimatedItems = motion.stagger.maxListItems,
}: AnimatedListItemProps) {
  const shouldAnimate = index < maxAnimatedItems;
  const { animatedStyle } = useEntrance({
    index,
    translateY: motion.translate.listItemY,
    durationMs: motion.duration.normal,
    staggerStep: motion.stagger.listStep,
    baseDelay: 0,
    enabled: shouldAnimate,
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
