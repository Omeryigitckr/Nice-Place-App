import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, TextStyle } from 'react-native';

import { duration, typography } from '../theme';

const calmEasing = Easing.out(Easing.cubic);

interface AnimatedStatValueProps {
  value: string;
  color: string;
  style?: StyleProp<TextStyle>;
}

/** Soft fade when a real stat value updates — never invents counts. */
export function AnimatedStatValue({ value, color, style }: AnimatedStatValueProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.setValue(0.35);
    Animated.timing(opacity, {
      toValue: 1,
      duration: duration.fast,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  }, [opacity, value]);

  return (
    <Animated.Text style={[styles.value, { color, opacity }, style]}>{value}</Animated.Text>
  );
}

const styles = {
  value: {
    ...typography.subtitle,
    fontSize: 18,
  },
};
