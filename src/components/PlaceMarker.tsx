import { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { hapticLight } from '../feedback';
import { motion, motionEasing } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

const SELECTED_SCALE = 1.15;
const PRESS_SCALE = motion.scale.mapPress;
const SELECT_MS = motion.duration.normal;
const APPEAR_MS = motion.duration.slow;

interface PlaceMarkerProps {
  title: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Premium map marker: one-time fade-in, selection scale, and press feedback.
 * Only the interacted/selected marker animates selection — no list-wide churn.
 */
export const PlaceMarker = memo(function PlaceMarker({
  title,
  selected,
  onPress,
}: PlaceMarkerProps) {
  const { colors, shadows } = useTheme();
  const appearOpacity = useRef(new Animated.Value(0)).current;
  const appearScale = useRef(new Animated.Value(0.92)).current;
  const selectionScale = useRef(new Animated.Value(selected ? SELECTED_SCALE : 1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const hasAppeared = useRef(false);

  useEffect(() => {
    if (hasAppeared.current) {
      return;
    }
    hasAppeared.current = true;

    Animated.parallel([
      Animated.timing(appearOpacity, {
        toValue: 1,
        duration: APPEAR_MS,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
      Animated.timing(appearScale, {
        toValue: 1,
        duration: APPEAR_MS,
        easing: motionEasing.out,
        useNativeDriver: true,
      }),
    ]).start();
  }, [appearOpacity, appearScale]);

  useEffect(() => {
    Animated.timing(selectionScale, {
      toValue: selected ? SELECTED_SCALE : 1,
      duration: SELECT_MS,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  }, [selected, selectionScale]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  const combinedScale = Animated.multiply(
    Animated.multiply(appearScale, selectionScale),
    pressScale,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      onPressIn={() => animatePress(PRESS_SCALE)}
      onPressOut={() => animatePress(1)}
      hitSlop={10}
    >
      <View style={styles.hitArea}>
        <Animated.View
          style={[
            styles.marker,
            selected ? shadows.sm : null,
            {
              opacity: appearOpacity,
              transform: [{ scale: combinedScale }],
            },
          ]}
        >
          <View
            style={[
              styles.ring,
              {
                borderColor: selected ? colors.accentBorder : colors.primaryBorder,
              },
            ]}
          />
          <View
            style={[
              styles.dot,
              {
                backgroundColor: selected ? colors.markerSelected : colors.marker,
                borderColor: colors.textPrimary,
              },
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hitArea: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
