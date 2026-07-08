import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components';
import { ROOT_ROUTES } from '../constants';
import { resetToMain } from '../navigation/navigationHelpers';
import { brand } from '../theme/brand';
import { duration, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types';
import { setOnboardingComplete } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROOT_ROUTES.ONBOARDING>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const calmEasing = Easing.out(Easing.cubic);

const BRAND_APP_ICON = require('../../docs/BrandKit/logos/01_App_Icon.png');

const SLIDES = [
  {
    id: 'discover',
    icon: 'map-outline' as const,
    title: 'Discover places',
    subtitle: 'Explore hidden outdoor spots, sunset points, and quiet places on the map.',
    accent: 'primary' as const,
  },
  {
    id: 'save',
    icon: 'bookmark-outline' as const,
    title: 'Save favorite places',
    subtitle: 'Build your personal collection of places worth visiting again.',
    accent: 'accent' as const,
  },
  {
    id: 'share',
    icon: 'share-social-outline' as const,
    title: 'Share places',
    subtitle: 'Help others find beautiful spots by sharing places you love.',
    accent: 'primary' as const,
  },
  {
    id: 'add',
    icon: 'add-circle-outline' as const,
    title: 'Add your own places',
    subtitle: 'Submit new places for review so the community can discover them too.',
    accent: 'accent' as const,
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const flatListRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      headerOpacity.setValue(1);
      headerTranslateY.setValue(0);
      return;
    }

    headerOpacity.setValue(0);
    headerTranslateY.setValue(12);

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, headerTranslateY, reduceMotion]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const finishOnboarding = async () => {
    await setOnboardingComplete();
    resetToMain(navigation);
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      return;
    }
    void finishOnboarding();
  };

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof SLIDES)[number]; index: number }) => (
      <OnboardingSlide
        slide={item}
        index={index}
        active={index === activeIndex}
        reduceMotion={reduceMotion}
        colors={colors}
      />
    ),
    [activeIndex, colors, reduceMotion],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Animated.View
          style={[
            styles.brandRow,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View
            style={[
              styles.brandIconWrap,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={BRAND_APP_ICON}
              style={styles.brandIcon}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.brandText}>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>{brand.name}</Text>
            <Text style={[styles.brandTagline, { color: colors.textMuted }]}>
              {brand.authTagline}
            </Text>
          </View>
        </Animated.View>

        <AppButton
          title="Skip"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => void finishOnboarding()}
          style={styles.skipButton}
        />
      </View>

      <FlatList
        ref={flatListRef}
        style={styles.list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScrollToIndexFailed={() => {}}
        renderItem={renderSlide}
        extraData={activeIndex}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <AnimatedDot key={slide.id} active={index === activeIndex} reduceMotion={reduceMotion} />
          ))}
        </View>

        <AppButton title={isLastSlide ? 'Get Started' : 'Next'} onPress={goNext} />
        <Text style={[styles.footerHint, { color: colors.textMuted }]}>
          Browse as a guest or sign in anytime from Profile.
        </Text>
      </View>
    </View>
  );
}

function OnboardingSlide({
  slide,
  index,
  active,
  reduceMotion,
  colors,
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  active: boolean;
  reduceMotion: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(active ? 0 : 14)).current;
  const iconScale = useRef(new Animated.Value(active ? 1 : 0.92)).current;
  const accentColor = slide.accent === 'accent' ? colors.accent : colors.primary;

  useEffect(() => {
    if (!active) {
      return;
    }

    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      iconScale.setValue(1);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(14);
    iconScale.setValue(0.92);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        delay: index * 20,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        delay: index * 20,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: duration.slow,
        delay: index * 20,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, iconScale, index, opacity, reduceMotion, translateY]);

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Animated.View
        style={[
          styles.slideContent,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconCircle,
            {
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}44`,
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          <Ionicons name={slide.icon} size={34} color={accentColor} />
        </Animated.View>

        <Text style={[styles.step, { color: accentColor }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{slide.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

function AnimatedDot({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  const { colors } = useTheme();
  const width = useRef(new Animated.Value(active ? 24 : 8)).current;

  useEffect(() => {
    if (reduceMotion) {
      width.setValue(active ? 24 : 8);
      return;
    }

    Animated.timing(width, {
      toValue: active ? 24 : 8,
      duration: duration.fast,
      easing: calmEasing,
      useNativeDriver: false,
    }).start();
  }, [active, reduceMotion, width]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          backgroundColor: active ? colors.primary : colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  brandIcon: {
    width: 52,
    height: 52,
  },
  brandText: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    ...typography.title,
    fontSize: 20,
  },
  brandTagline: {
    ...typography.caption,
    letterSpacing: 0.4,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  slideContent: {
    gap: spacing.md,
    maxWidth: 340,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  step: {
    ...typography.caption,
    letterSpacing: 2,
    fontWeight: '700',
  },
  title: {
    ...typography.hero,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footerHint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
