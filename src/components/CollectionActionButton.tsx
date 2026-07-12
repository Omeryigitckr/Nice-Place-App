import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { radius, spacing, typography } from '../theme';
import { iconSizes } from '../theme/icons';
import { useThemeColors } from '../theme/ThemeContext';

export type CollectionActionVariant = 'secondary' | 'destructive' | 'tertiary';

interface CollectionActionButtonProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  variant?: CollectionActionVariant;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const MIN_TOUCH = 44;

export function CollectionActionButton({
  label,
  icon: Icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
  compact = false,
  style,
  accessibilityLabel,
}: CollectionActionButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const palette =
    variant === 'destructive'
      ? {
          backgroundColor: colors.surface,
          borderColor: colors.error,
          textColor: colors.error,
          iconColor: colors.error,
        }
      : variant === 'tertiary'
        ? {
            backgroundColor: 'transparent',
            borderColor: colors.border,
            textColor: colors.textSecondary,
            iconColor: colors.textMuted,
          }
        : {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            textColor: colors.textSecondary,
            iconColor: colors.primary,
          };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.regular,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.iconColor} />
      ) : (
        <Icon size={compact ? iconSizes.xs : iconSizes.sm} color={palette.iconColor} strokeWidth={2.2} />
      )}
      {!compact ? (
        <Text style={[styles.label, { color: palette.textColor }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    minHeight: MIN_TOUCH,
  },
  regular: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  compact: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    paddingHorizontal: 0,
    borderRadius: radius.lg,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
