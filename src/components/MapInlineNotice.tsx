import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { mapMotion, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface MapInlineNoticeProps {
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'neutral' | 'accent' | 'primary';
}

const calmEasing = Easing.out(Easing.cubic);

export function MapInlineNotice({ message, icon, tone = 'neutral' }: MapInlineNoticeProps) {
  const { colors, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(6);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: mapMotion.fadeMs,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: mapMotion.fadeMs,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, opacity, translateY]);

  const iconColor =
    tone === 'accent' ? colors.accent : tone === 'primary' ? colors.primary : colors.textMuted;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
          ...shadows.sm,
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    ...typography.caption,
    fontSize: 12,
    flexShrink: 1,
  },
});
