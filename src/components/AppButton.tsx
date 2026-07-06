import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { usePressScale } from '../motion';
import { radius, spacing, typography } from '../theme';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}: AppButtonProps) {
  const { colors, shadows, colorScheme } = useTheme();
  const isLight = colorScheme === 'light';
  const isDisabled = disabled || loading;
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    pressedScale: motion.scale.press,
    disabled: isDisabled,
  });

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: colors.primary,
          borderWidth: 1,
          borderColor: colors.primaryDark,
          ...(isLight ? shadows.sm : shadows.sm),
        }
      : variant === 'secondary'
        ? {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }
        : variant === 'accent'
          ? {
              backgroundColor: colors.accentLight,
              borderWidth: 1,
              borderColor: colors.accentBorder,
            }
          : {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: 'transparent',
            };

  const labelColor =
    variant === 'primary'
      ? colors.white
      : variant === 'ghost'
        ? colors.primary
        : variant === 'accent'
          ? colors.accent
          : colors.textPrimary;

  const spinnerColor = variant === 'primary' ? colors.white : colors.primary;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.base,
          sizeStyles[size],
          variantStyle,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          <Text
            style={[
              styles.label,
              { color: isDisabled ? colors.textMuted : labelColor },
            ]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.42,
  },
  label: {
    ...typography.button,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  lg: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
});
