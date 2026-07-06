import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { iconSizes, mapMotion, shadows } from '../theme';
import { darkColors } from '../theme/palettes';

/** Map overlay FAB stays dark/glass in both themes. */
const colors = darkColors;

type IconName = keyof typeof Ionicons.glyphMap;

interface MapFabButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'glass' | 'primary';
  style?: ViewStyle;
  loading?: boolean;
}

const GLASS_SIZE = 44;
const PRIMARY_SIZE = 50;
const calmEasing = Easing.out(Easing.cubic);

export function MapFabButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'glass',
  style,
  loading = false,
}: MapFabButtonProps) {
  const size = variant === 'primary' ? PRIMARY_SIZE : GLASS_SIZE;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const loadingOpacity = useRef(new Animated.Value(loading ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(loadingOpacity, {
      toValue: loading ? 1 : 0,
      duration: mapMotion.pressMs,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  }, [loading, loadingOpacity]);

  const animatePress = (toValue: number) => {
    Animated.timing(scaleAnim, {
      toValue,
      duration: mapMotion.pressMs,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={loading}
        onPressIn={() => {
          if (!loading) {
            animatePress(mapMotion.pressScale);
          }
        }}
        onPressOut={() => animatePress(1)}
        style={[
          styles.base,
          { width: size, height: size, borderRadius: size / 2 },
          variant === 'primary' ? styles.primary : styles.glass,
        ]}
      >
        <Animated.View
          style={[styles.iconLayer, { opacity: loadingOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }) }]}
        >
          <Ionicons
            name={icon}
            size={variant === 'primary' ? iconSizes.lg : iconSizes.md}
            color={colors.textPrimary}
          />
        </Animated.View>
        <Animated.View style={[styles.loadingLayer, { opacity: loadingOpacity }]}>
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textPrimary : colors.primary}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const MAP_FAB_PRIMARY_SIZE = PRIMARY_SIZE;
export const MAP_FAB_GLASS_SIZE = GLASS_SIZE;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  glass: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  iconLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
