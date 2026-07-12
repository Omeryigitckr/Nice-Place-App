import { useEffect } from 'react';
import {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '../../theme/motion';

const calmEasing = Easing.out(Easing.cubic);

export function useSlideEntrance(isActive: boolean, reduceMotion: boolean, delay = 0) {
  const opacity = useSharedValue(isActive && reduceMotion ? 1 : 0);
  const translateY = useSharedValue(isActive && reduceMotion ? 0 : 18);

  useEffect(() => {
    if (!isActive) {
      opacity.value = reduceMotion ? 1 : 0;
      translateY.value = reduceMotion ? 0 : 18;
      return;
    }

    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: motion.duration.slow, easing: calmEasing }),
    );
    translateY.value = withDelay(delay, withSpring(0, motion.spring.gentle));
  }, [delay, isActive, opacity, reduceMotion, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

export function useFloatingMotion(
  enabled: boolean,
  reduceMotion: boolean,
  amplitude = 6,
  delay = 0,
) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      translateY.value = withTiming(0, { duration: motion.duration.fast });
      return;
    }

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, { duration: 2400, easing: calmEasing }),
          withTiming(amplitude, { duration: 2400, easing: calmEasing }),
        ),
        -1,
        true,
      ),
    );
  }, [amplitude, delay, enabled, reduceMotion, translateY]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
}

/** Subtle scale pulse for a floating logo — translation-free breathing. */
export function useBreathingMotion(enabled: boolean, reduceMotion: boolean) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      scale.value = withTiming(1, { duration: motion.duration.fast });
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [enabled, reduceMotion, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

export function useScaleEntrance(isActive: boolean, reduceMotion: boolean, delay = 0) {
  const opacity = useSharedValue(isActive && reduceMotion ? 1 : 0);
  const scale = useSharedValue(isActive && reduceMotion ? 1 : 0.88);

  useEffect(() => {
    if (!isActive) {
      opacity.value = reduceMotion ? 1 : 0;
      scale.value = reduceMotion ? 1 : 0.88;
      return;
    }

    if (reduceMotion) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: motion.duration.slow, easing: calmEasing }),
    );
    scale.value = withDelay(delay, withSpring(1, motion.spring.default));
  }, [delay, isActive, opacity, reduceMotion, scale]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
}

export function useStaggerFade(
  isActive: boolean,
  reduceMotion: boolean,
  index: number,
  baseDelay = 120,
) {
  const opacity = useSharedValue(isActive && reduceMotion ? 1 : 0);
  const translateY = useSharedValue(isActive && reduceMotion ? 0 : 12);

  useEffect(() => {
    const delay = baseDelay + index * motion.stagger.step;

    if (!isActive) {
      opacity.value = reduceMotion ? 1 : 0;
      translateY.value = reduceMotion ? 0 : 12;
      return;
    }

    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: motion.duration.normal, easing: calmEasing }),
    );
    translateY.value = withDelay(delay, withSpring(0, motion.spring.gentle));
  }, [baseDelay, index, isActive, opacity, reduceMotion, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

export function useParallaxShift(scrollOffset: SharedValue<number>, index: number, width: number) {
  return useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const translateX = scrollOffset.value;
    const pageOffset = index * width - translateX;
    const parallax = pageOffset * 0.12;

    return {
      transform: [{ translateX: parallax }],
    };
  });
}
