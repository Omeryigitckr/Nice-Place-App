import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { mapMotion, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface SortChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const calmEasing = Easing.out(Easing.cubic);

export function SortChip({ label, active, onPress, icon }: SortChipProps) {
  const { colors, shadows } = useTheme();
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: mapMotion.chipMs,
      easing: calmEasing,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: mapMotion.pressMs,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.chipActiveBackground],
  });

  const borderColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primaryBorderStrong],
  });

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        onPressIn={() => animatePress(mapMotion.pressScale)}
        onPressOut={() => animatePress(1)}
      >
        <Animated.View
          style={[
            styles.chip,
            {
              backgroundColor,
              borderColor,
              ...(active ? shadows.sm : null),
            },
          ]}
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={13}
              color={active ? colors.primary : colors.textMuted}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              { color: active ? colors.primary : colors.textSecondary },
            ]}
          >
            {label}
          </Text>
          {active ? (
            <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 6,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: {
    ...typography.chip,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 1,
  },
});
