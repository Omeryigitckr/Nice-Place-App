import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';

import { motion, motionEasing } from '../theme/motion';

interface UsePressScaleOptions {
  /** Target scale while pressed. Defaults to `motion.scale.press`. */
  pressedScale?: number;
  disabled?: boolean;
}

/** Shared press-scale animation for buttons, cards, and controls. */
export function usePressScale(options: UsePressScaleOptions = {}) {
  const { pressedScale = motion.scale.press, disabled = false } = options;
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.timing(scale, {
        toValue,
        duration: motion.duration.fast,
        easing: motionEasing.out,
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  const onPressIn = useCallback(() => {
    if (!disabled) {
      animateTo(pressedScale);
    }
  }, [animateTo, disabled, pressedScale]);

  const onPressOut = useCallback(() => {
    animateTo(1);
  }, [animateTo]);

  return {
    scale,
    onPressIn,
    onPressOut,
    animatedStyle: { transform: [{ scale }] },
  };
}
