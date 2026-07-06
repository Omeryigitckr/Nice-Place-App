import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { hapticSelection } from '../feedback';
import { motion, motionEasing } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

const PRESS_SCALE = motion.scale.mapPress;
const ACTIVE_SCALE = 1.06;
const INACTIVE_SCALE = 1;

/**
 * Premium tab item: press scale, active scale-up, and a minimal active pill.
 * Navigation behavior is unchanged — visual feedback only.
 */
export function AnimatedTabBarButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  accessibilityRole,
  testID,
  style,
}: BottomTabBarButtonProps) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected ?? false;

  const pressScale = useRef(new Animated.Value(1)).current;
  const activeScale = useRef(new Animated.Value(focused ? ACTIVE_SCALE : INACTIVE_SCALE)).current;
  const indicatorOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const indicatorScale = useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const labelBoost = useRef(new Animated.Value(focused ? 1 : 0.86)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(activeScale, {
        toValue: focused ? ACTIVE_SCALE : INACTIVE_SCALE,
        duration: motion.duration.normal,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: focused ? 1 : 0,
        duration: motion.duration.normal,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorScale, {
        toValue: focused ? 1 : 0.6,
        duration: motion.duration.normal,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
      Animated.timing(labelBoost, {
        toValue: focused ? 1 : 0.86,
        duration: motion.duration.normal,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeScale, focused, indicatorOpacity, indicatorScale, labelBoost]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={(event) => {
        hapticSelection();
        onPress?.(event);
      }}
      onLongPress={onLongPress}
      onPressIn={() => animatePress(PRESS_SCALE)}
      onPressOut={() => animatePress(1)}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.pressable, style]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: labelBoost,
            transform: [{ scale: Animated.multiply(pressScale, activeScale) }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              backgroundColor: colors.tabActive,
              opacity: indicatorOpacity,
              transform: [{ scaleX: indicatorScale }, { scaleY: indicatorScale }],
            },
          ]}
        />
        <View style={styles.children}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  indicator: {
    position: 'absolute',
    top: -2,
    width: 14,
    height: 3,
    borderRadius: 99,
  },
  children: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
