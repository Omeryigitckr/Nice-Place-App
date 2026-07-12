import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { duration, radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

interface PlaceDetailStickyActionsProps {
  liked: boolean;
  likeCount: number;
  likeDisabled?: boolean;
  saved: boolean;
  saveDisabled?: boolean;
  bottomInset: number;
  onNavigate: () => void;
  onLike: () => void;
  onSave: () => void;
}

const PRESS_SCALE = 0.97;
const calmEasing = Easing.out(Easing.cubic);

export function PlaceDetailStickyActions({
  liked,
  likeCount,
  likeDisabled = false,
  saved,
  saveDisabled = false,
  bottomInset,
  onNavigate,
  onLike,
  onSave,
}: PlaceDetailStickyActionsProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const entranceY = useRef(new Animated.Value(16)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: duration.normal,
        delay: 120,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(entranceY, {
        toValue: 0,
        duration: duration.normal,
        delay: 120,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceY]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          paddingBottom: bottomInset + spacing.sm,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          opacity: entranceOpacity,
          transform: [{ translateY: entranceY }],
          ...shadows.sm,
        },
      ]}
    >
      <View style={styles.bar}>
        <ActionButton
          icon="navigate"
          label={t('placeDetail.sticky.navigate')}
          accessibilityLabel={t('explore.preview.a11yNavigate')}
          onPress={onNavigate}
          variant="primary"
          colors={colors}
        />
        <ActionButton
          icon={liked ? 'heart' : 'heart-outline'}
          label={`${Math.max(0, likeCount)}`}
          accessibilityLabel={
            liked
              ? t('placeDetail.sticky.unlikeA11y', { count: Math.max(0, likeCount) })
              : t('placeDetail.sticky.likeA11y', { count: Math.max(0, likeCount) })
          }
          onPress={onLike}
          variant="secondary"
          active={liked}
          disabled={likeDisabled}
          popOnActive
          animateLabelKey={likeCount}
          colors={colors}
        />
        <ActionButton
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          label={saved ? t('place.saved') : t('place.save')}
          accessibilityLabel={saved ? t('place.unsaveA11y') : t('place.saveA11y')}
          onPress={onSave}
          variant="secondary"
          active={saved}
          disabled={saveDisabled}
          popOnActive
          colors={colors}
        />
      </View>
    </Animated.View>
  );
}

function ActionButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
  variant,
  active = false,
  disabled = false,
  popOnActive = false,
  animateLabelKey,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
  active?: boolean;
  disabled?: boolean;
  popOnActive?: boolean;
  animateLabelKey?: string | number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const isPrimary = variant === 'primary';
  const pressScale = useRef(new Animated.Value(1)).current;
  const popScale = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!popOnActive || !active) {
      return;
    }

    Animated.sequence([
      Animated.timing(popScale, {
        toValue: 1.08,
        duration: 90,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(popScale, {
        toValue: 1,
        duration: 140,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, popOnActive, popScale]);

  useEffect(() => {
    if (animateLabelKey === undefined) {
      return;
    }

    labelOpacity.setValue(0.4);
    Animated.timing(labelOpacity, {
      toValue: 1,
      duration: duration.fast,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  }, [animateLabelKey, labelOpacity]);

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      damping: 20,
      stiffness: 360,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.buttonWrap,
        { transform: [{ scale: Animated.multiply(pressScale, popScale) }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (!disabled) {
            animatePress(PRESS_SCALE);
          }
        }}
        onPressOut={() => animatePress(1)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.button,
          isPrimary
            ? {
                backgroundColor: colors.primary,
                borderColor: colors.primaryDark,
              }
            : {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
          active && {
            backgroundColor: colors.primaryLight,
            borderColor: colors.primaryBorderStrong,
          },
          disabled && styles.buttonDisabled,
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            isPrimary ? colors.white : active ? colors.primary : colors.textSecondary
          }
        />
        <Animated.Text
          style={[
            styles.buttonLabel,
            {
              opacity: labelOpacity,
              color: isPrimary
                ? colors.white
                : active
                  ? colors.primary
                  : colors.textSecondary,
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonWrap: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonLabel: {
    ...typography.button,
    fontSize: 14,
  },
});

export const PLACE_DETAIL_STICKY_ACTIONS_HEIGHT = 48 + spacing.sm * 2 + 1;
