import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { motion, motionEasing } from '../theme/motion';

import { useReducedMotion } from './useReducedMotion';

interface UseEntranceOptions {
  /** Stagger index (0-based). */
  index?: number;
  /** Initial translateY distance. */
  translateY?: number;
  /** Override entrance duration. */
  durationMs?: number;
  /** Stagger step override. */
  staggerStep?: number;
  /** Base delay before first item. */
  baseDelay?: number;
  /** When false, renders at rest immediately. */
  enabled?: boolean;
}

/** Fade + translateY entrance used by screens, sections, and list items. */
export function useEntrance(options: UseEntranceOptions = {}) {
  const {
    index = 0,
    translateY: fromY = motion.translate.screenY,
    durationMs = motion.duration.normal,
    staggerStep = motion.stagger.step,
    baseDelay = motion.stagger.baseDelay,
    enabled = true,
  } = options;

  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(enabled ? fromY : 0)).current;

  useEffect(() => {
    if (!enabled || reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(fromY);

    const delay = baseDelay + index * staggerStep;
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: durationMs,
        delay,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: durationMs,
        delay,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [
    baseDelay,
    durationMs,
    enabled,
    fromY,
    index,
    opacity,
    reduceMotion,
    staggerStep,
    translateY,
  ]);

  return {
    opacity,
    translateY,
    animatedStyle: {
      opacity,
      transform: [{ translateY }],
    },
  };
}
