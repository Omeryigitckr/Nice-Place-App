import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { duration, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const calmEasing = Easing.out(Easing.cubic);

interface AuthErrorMessageProps {
  message: string | null;
}

/**
 * Smoothly fades/slides validation errors without jumping the form layout.
 */
export function AuthErrorMessage({ message }: AuthErrorMessageProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-6)).current;
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (message) {
      setDisplayMessage(message);
      opacity.setValue(0);
      translateY.setValue(-6);
      animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration.normal,
          easing: calmEasing,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration.normal,
          easing: calmEasing,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    } else {
      animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration.fast,
          easing: calmEasing,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -4,
          duration: duration.fast,
          easing: calmEasing,
          useNativeDriver: true,
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished) {
          setDisplayMessage(null);
        }
      });
    }

    return () => {
      animation?.stop();
    };
  }, [message, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      {displayMessage ? (
        <Text style={[styles.text, { color: colors.error }]}>{displayMessage}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 20,
    justifyContent: 'center',
  },
  text: {
    ...typography.bodySmall,
  },
});
