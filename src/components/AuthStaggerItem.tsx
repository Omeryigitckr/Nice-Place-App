import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

import { duration } from '../theme';

const calmEasing = Easing.out(Easing.cubic);
const STAGGER_BASE_MS = 280;
const STAGGER_STEP_MS = 48;
const INITIAL_TRANSLATE_Y = 10;

interface AuthStaggerItemProps {
  /** 0-based order in the form entrance sequence. */
  index: number;
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Fades and slides a form block in with a slight stagger after the logo.
 * Motion-only — no layout redesign.
 */
export function AuthStaggerItem({ index, children, style }: AuthStaggerItemProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(INITIAL_TRANSLATE_Y)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(INITIAL_TRANSLATE_Y);

    const delay = STAGGER_BASE_MS + index * STAGGER_STEP_MS;
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        delay,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        delay,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => {
      animation.stop();
    };
  }, [index, opacity, reduceMotion, translateY]);

  return (
    <Animated.View
      style={[
        styles.item,
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
  },
});
