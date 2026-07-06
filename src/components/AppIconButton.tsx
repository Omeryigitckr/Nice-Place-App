import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { usePressScale } from '../motion';
import { iconSizes } from '../theme';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

type IconButtonVariant = 'glass' | 'ghost' | 'primary';

interface AppIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  variant?: IconButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppIconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  iconSize = iconSizes.lg,
  variant = 'glass',
  disabled = false,
  style,
}: AppIconButtonProps) {
  const { colors, shadows } = useTheme();
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    pressedScale: motion.scale.mapPress,
    disabled,
  });

  const iconColor =
    variant === 'primary'
      ? colors.textPrimary
      : variant === 'ghost'
        ? colors.primary
        : colors.textPrimary;

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: colors.primary,
          borderColor: colors.primaryMuted,
        }
      : variant === 'ghost'
        ? {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }
        : {
            backgroundColor: colors.scrim,
            borderColor: colors.glassBorder,
            ...shadows.sm,
          };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.base,
          variantStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
          },
          disabled && styles.disabled,
          style,
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
