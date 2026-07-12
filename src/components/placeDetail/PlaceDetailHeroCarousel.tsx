import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { iconSizes, radius, spacing } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { CachedImage } from '../CachedImage';

interface PlaceDetailHeroCarouselProps {
  images: string[];
  liked: boolean;
  likeDisabled?: boolean;
  saved: boolean;
  saveDisabled?: boolean;
  topInset: number;
  onBack: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onImagePress?: (index: number) => void;
}

const HERO_HEIGHT = 380;
const PRESS_SCALE = 0.96;
const calmEasing = Easing.out(Easing.cubic);

export function PlaceDetailHeroCarousel({
  images,
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
}: PlaceDetailHeroCarouselProps) {
  const { t } = useTranslation();
  const { colors, shadows, colorScheme } = useTheme();
  const isLightTheme = colorScheme === 'light';
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const gallery = images.length > 0 ? images : [''];
  const showPager = gallery.length > 1;

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(index);
    },
    [width],
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceElevated }]}>
      <FlatList
        data={gallery}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onImagePress?.(index)}
            disabled={!onImagePress || !item}
            style={{ width }}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('placeDetail.photos.imageNumber', {
              current: index + 1,
              total: gallery.length,
            })}
          >
            <CachedImage
              uri={item}
              width={width}
              height={HERO_HEIGHT}
              borderRadius={0}
              recyclingKey={`${item}-${index}`}
              priority="high"
              transitionMs={0}
            />
          </Pressable>
        )}
      />

      {showPager ? (
        <>
          <View style={styles.counterWrap} pointerEvents="none">
            <Text style={styles.counterText}>
              {activeIndex + 1}/{gallery.length}
            </Text>
          </View>
          <View style={styles.dotsWrap} pointerEvents="none">
            {gallery.map((uri, index) => (
              <View
                key={`dot-${uri}-${index}`}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === activeIndex ? colors.primary : 'rgba(255,255,255,0.55)',
                  },
                ]}
              />
            ))}
          </View>
        </>
      ) : null}

      <View style={[styles.actions, { paddingTop: topInset + spacing.sm }]}>
        <HeroIconButton
          icon="chevron-back"
          onPress={onBack}
          accessibilityLabel={t('common.back')}
          colors={colors}
          shadows={shadows}
          isLightTheme={isLightTheme}
        />
        <View style={styles.actionsRight}>
          <HeroIconButton
            icon="share-outline"
            onPress={onShare}
            accessibilityLabel={t('placeDetail.share.a11y')}
            colors={colors}
            shadows={shadows}
            isLightTheme={isLightTheme}
          />
          <HeroIconButton
            icon={liked ? 'heart' : 'heart-outline'}
            onPress={onLike}
            accessibilityLabel={liked ? t('place.a11yUnlike') : t('place.a11yLike')}
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
            accessibilityLabel={saved ? t('place.unsaveA11y') : t('place.saveA11y')}
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
  counterWrap: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dotsWrap: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
