import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import type { ToastTone } from '../feedback';
import { motion, motionEasing } from '../theme/motion';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface ToastBannerProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: ToastTone;
}

export function ToastBanner({
  message,
  visible,
  onDismiss,
  durationMs = 2600,
  icon = 'information-circle-outline',
  tone = 'info',
}: ToastBannerProps) {
  const { colors, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    opacity.setValue(0);
    translateY.setValue(-8);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.normal,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.duration.normal,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: motion.duration.fast,
          easing: motionEasing.out,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -6,
          duration: motion.duration.fast,
          easing: motionEasing.out,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onDismiss();
        }
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onDismiss, opacity, translateY, visible, message]);

  if (!visible) {
    return null;
  }

  const iconColor =
    tone === 'success'
      ? colors.success
      : tone === 'error'
        ? colors.error
        : colors.primary;

  const borderColor =
    tone === 'success'
      ? colors.primaryBorder
      : tone === 'error'
        ? colors.error
        : colors.border;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <Pressable
        style={[
          styles.banner,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor,
            ...shadows.sm,
          },
        ]}
        onPress={onDismiss}
      >
        <Ionicons name={icon} size={14} color={iconColor} />
        <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
    zIndex: 50,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    ...typography.caption,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
