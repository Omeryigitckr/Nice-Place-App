import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { duration, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

const PRESS_SCALE = 0.97;
const calmEasing = Easing.out(Easing.cubic);

export function FilterChip({ label, active = false, onPress }: FilterChipProps) {
  const { colors } = useTheme();
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: duration.normal,
      easing: calmEasing,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      damping: 20,
      stiffness: 360,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.chipBackground, colors.chipActiveBackground],
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
        onPressIn={() => animatePress(PRESS_SCALE)}
        onPressOut={() => animatePress(1)}
      >
        <Animated.View style={[styles.chip, { backgroundColor, borderColor }]}>
          <Text
            style={[
              styles.label,
              { color: active ? colors.primary : colors.textSecondary },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  label: {
    ...typography.chip,
  },
});
