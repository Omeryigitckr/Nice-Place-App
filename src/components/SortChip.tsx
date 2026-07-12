import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { mapMotion, motion, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface SortChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const SELECT_SCALE = 0.97;
const SELECT_MS = 200;
const calmEasing = Easing.out(Easing.cubic);
const AnimatedText = Animated.createAnimatedComponent(Text);

export function SortChip({ label, active, onPress, icon }: SortChipProps) {
  const { colors, shadows } = useTheme();
  const pressScale = useRef(new Animated.Value(1)).current;
  const selectScale = useRef(new Animated.Value(1)).current;
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const wasActive = useRef(active);

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: mapMotion.chipMs,
      easing: calmEasing,
      useNativeDriver: false,
    }).start();

    if (active && !wasActive.current) {
      selectScale.setValue(1);
      Animated.sequence([
        Animated.timing(selectScale, {
          toValue: SELECT_SCALE,
          duration: SELECT_MS / 2,
          easing: calmEasing,
          useNativeDriver: true,
        }),
        Animated.timing(selectScale, {
          toValue: 1,
          duration: SELECT_MS / 2,
          easing: calmEasing,
          useNativeDriver: true,
        }),
      ]).start();
    }
    wasActive.current = active;
  }, [active, activeProgress, selectScale]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: motion.duration.normal,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primary],
  });

  const borderColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const contentColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textSecondary, colors.white],
  });

  const inactiveIconOpacity = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const activeIconOpacity = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: Animated.multiply(pressScale, selectScale) }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        onPressIn={() => animatePress(SELECT_SCALE)}
        onPressOut={() => animatePress(1)}
      >
        <Animated.View
          style={[
            styles.chip,
            {
              backgroundColor,
              borderColor,
              ...(active ? shadows.md : null),
            },
          ]}
        >
          {icon ? (
            <View style={styles.iconWrap}>
              <Animated.View style={[styles.iconLayer, { opacity: inactiveIconOpacity }]}>
                <Ionicons name={icon} size={13} color={colors.textMuted} />
              </Animated.View>
              <Animated.View style={[styles.iconLayer, { opacity: activeIconOpacity }]}>
                <Ionicons name={icon} size={13} color={colors.white} />
              </Animated.View>
            </View>
          ) : null}
          <AnimatedText style={[styles.label, { color: contentColor }]}>{label}</AnimatedText>
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
  iconWrap: {
    width: 13,
    height: 13,
  },
  iconLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.chip,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
