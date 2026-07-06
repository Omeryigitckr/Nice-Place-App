import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { duration, radius, spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const calmEasing = Easing.out(Easing.cubic);

export function AppTextInput({ label, error, style, onFocus, onBlur, ...props }: AppTextInputProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const focusProgress = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(error ? 1 : 0)).current;
  const errorTranslateY = useRef(new Animated.Value(error ? 0 : -4)).current;
  const [errorText, setErrorText] = useState(error ?? null);

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: focused ? 1 : 0,
      duration: duration.normal,
      easing: calmEasing,
      useNativeDriver: false,
    }).start();
  }, [focusProgress, focused]);

  useEffect(() => {
    if (error) {
      setErrorText(error);
      errorOpacity.setValue(0);
      errorTranslateY.setValue(-4);
      Animated.parallel([
        Animated.timing(errorOpacity, {
          toValue: 1,
          duration: duration.normal,
          easing: calmEasing,
          useNativeDriver: true,
        }),
        Animated.timing(errorTranslateY, {
          toValue: 0,
          duration: duration.normal,
          easing: calmEasing,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(errorOpacity, {
        toValue: 0,
        duration: duration.fast,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(errorTranslateY, {
        toValue: -4,
        duration: duration.fast,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setErrorText(null);
      }
    });
  }, [error, errorOpacity, errorTranslateY]);

  const borderColor = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.error : colors.border, error ? colors.error : colors.primaryBorderStrong],
  });

  const backgroundColor = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.input, colors.surfaceElevated],
  });

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <Animated.View style={[styles.inputWrap, { borderColor, backgroundColor }]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary }, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </Animated.View>
      <Animated.View
        style={{
          minHeight: errorText ? undefined : 0,
          opacity: errorOpacity,
          transform: [{ translateY: errorTranslateY }],
        }}
      >
        {errorText ? (
          <Text style={[styles.error, { color: colors.error }]}>{errorText}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  input: {
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  error: {
    ...typography.caption,
  },
});
