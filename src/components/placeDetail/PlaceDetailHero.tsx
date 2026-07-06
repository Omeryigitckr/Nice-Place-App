import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { iconSizes, radius, spacing } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { CachedImage } from '../CachedImage';

interface PlaceDetailHeroProps {
  imageUri: string;
  liked: boolean;
  likeDisabled?: boolean;
  saved: boolean;
  saveDisabled?: boolean;
  topInset: number;
  onBack: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onImagePress?: () => void;
}

const HERO_HEIGHT = 380;
const PRESS_SCALE = 0.96;
const calmEasing = Easing.out(Easing.cubic);

export function PlaceDetailHero({
  imageUri,
  liked,
  likeDisabled = false,
  saved,
  saveDisabled = false,
  topInset,
  onBack,
  onLike,
  onSave,
  onShare,
  onImagePress,
}: PlaceDetailHeroProps) {
  const { colors, shadows, colorScheme } = useTheme();
  const isLightTheme = colorScheme === 'light';

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceElevated }]}>
      <Pressable onPress={onImagePress} disabled={!onImagePress}>
        <CachedImage
          uri={imageUri}
          width="100%"
          height={HERO_HEIGHT}
          borderRadius={0}
          recyclingKey={imageUri}
          priority="high"
          transitionMs={120}
        />
      </Pressable>

      <View style={[styles.gradientTop, { backgroundColor: colors.scrim }]} pointerEvents="none" />
      <View
        style={[styles.gradientBottom, { backgroundColor: colors.scrimDark }]}
        pointerEvents="none"
      />

      <View style={[styles.actions, { paddingTop: topInset + spacing.sm }]}>
        <HeroIconButton
          icon="chevron-back"
          onPress={onBack}
          accessibilityLabel="Go back"
          colors={colors}
          shadows={shadows}
          isLightTheme={isLightTheme}
        />
        <View style={styles.actionsRight}>
          <HeroIconButton
            icon="share-outline"
            onPress={onShare}
            accessibilityLabel="Share place"
            colors={colors}
            shadows={shadows}
            isLightTheme={isLightTheme}
          />
          <HeroIconButton
            icon={liked ? 'heart' : 'heart-outline'}
            onPress={onLike}
            accessibilityLabel={liked ? 'Unlike place' : 'Like place'}
            active={liked}
            disabled={likeDisabled}
            popOnActive
            colors={colors}
            shadows={shadows}
            isLightTheme={isLightTheme}
          />
          <HeroIconButton
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            onPress={onSave}
            accessibilityLabel={saved ? 'Remove from saved' : 'Save place'}
            active={saved}
            disabled={saveDisabled}
            popOnActive
            colors={colors}
            shadows={shadows}
            isLightTheme={isLightTheme}
          />
        </View>
      </View>
    </View>
  );
}

export const PLACE_DETAIL_HERO_HEIGHT = HERO_HEIGHT;

function HeroIconButton({
  icon,
  onPress,
  accessibilityLabel,
  active = false,
  disabled = false,
  popOnActive = false,
  colors,
  shadows,
  isLightTheme = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  active?: boolean;
  disabled?: boolean;
  popOnActive?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  shadows: ReturnType<typeof useTheme>['shadows'];
  isLightTheme?: boolean;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const popScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!popOnActive || !active) {
      return;
    }

    Animated.sequence([
      Animated.timing(popScale, {
        toValue: 1.12,
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
    <Animated.View style={{ transform: [{ scale: Animated.multiply(pressScale, popScale) }] }}>
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
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.iconButton,
          {
            backgroundColor: active
              ? colors.primaryLight
              : isLightTheme
                ? 'rgba(255, 255, 255, 0.92)'
                : colors.scrimHeavy,
            borderColor: active
              ? colors.primaryBorderStrong
              : isLightTheme
                ? 'rgba(15, 23, 42, 0.08)'
                : colors.glassBorder,
            ...shadows.sm,
          },
          disabled && styles.iconButtonDisabled,
        ]}
      >
        <Ionicons
          name={icon}
          size={iconSizes.md}
          color={active ? colors.primary : colors.textPrimary}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HERO_HEIGHT,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.35,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    opacity: 0.55,
  },
  actions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  actionsRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconButtonDisabled: {
    opacity: 0.55,
  },
});
