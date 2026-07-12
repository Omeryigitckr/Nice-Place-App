import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import PagerView from 'react-native-pager-view';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppButton } from '../../components';
import {
  ExploreSlide,
  OnboardingDots,
  OnboardingPage,
  PlaceDetailSlide,
  ReadySlide,
  SaveShareSlide,
  WelcomeSlide,
} from '../../components/onboarding';
import { ONBOARDING_SLIDE_COUNT } from '../../constants/onboardingSlides';
import { ROOT_ROUTES } from '../../constants';
import { useOnboardingNavigation } from '../../hooks/useOnboardingNavigation';
import { useReducedMotion } from '../../motion';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROOT_ROUTES.ONBOARDING>;

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

export function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { finishOnboarding } = useOnboardingNavigation(navigation);

  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollOffset = useSharedValue(0);

  const isLastSlide = activeIndex === ONBOARDING_SLIDE_COUNT - 1;

  const goToPage = useCallback(
    (index: number) => {
      pagerRef.current?.setPage(index);
    },
    [],
  );

  const goNext = useCallback(() => {
    if (activeIndex < ONBOARDING_SLIDE_COUNT - 1) {
      goToPage(activeIndex + 1);
      return;
    }
    void finishOnboarding();
  }, [activeIndex, finishOnboarding, goToPage]);

  const handlePageScroll = useCallback(
    (event: { nativeEvent: { position: number; offset: number } }) => {
      const { position, offset } = event.nativeEvent;
      scrollOffset.value = (position + offset) * width;
    },
    [scrollOffset, width],
  );

  const handlePageSelected = useCallback(
    (event: { nativeEvent: { position: number } }) => {
      const position = event.nativeEvent.position;
      setActiveIndex(position);
      scrollOffset.value = position * width;
    },
    [scrollOffset, width],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + spacing.sm,
            paddingRight: Math.max(insets.right, spacing.lg) + spacing.md,
            paddingLeft: Math.max(insets.left, spacing.lg),
          },
        ]}
      >
        {!isLastSlide ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.actions.skip')}
            hitSlop={12}
            onPress={() => void finishOnboarding()}
            style={styles.skipPressable}
          >
            <Text style={[styles.skipLabel, { color: colors.primary }]}>
              {t('onboarding.actions.skip')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <AnimatedPagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={handlePageScroll}
        onPageSelected={handlePageSelected}
        overdrag
      >
        <OnboardingPage
          key="welcome"
          index={0}
          width={width}
          scrollOffset={scrollOffset}
          reduceMotion={reduceMotion}
        >
          <WelcomeSlide isActive={activeIndex === 0} reduceMotion={reduceMotion} />
        </OnboardingPage>
        <OnboardingPage
          key="explore"
          index={1}
          width={width}
          scrollOffset={scrollOffset}
          reduceMotion={reduceMotion}
        >
          <ExploreSlide isActive={activeIndex === 1} reduceMotion={reduceMotion} />
        </OnboardingPage>
        <OnboardingPage
          key="details"
          index={2}
          width={width}
          scrollOffset={scrollOffset}
          reduceMotion={reduceMotion}
        >
          <PlaceDetailSlide isActive={activeIndex === 2} reduceMotion={reduceMotion} />
        </OnboardingPage>
        <OnboardingPage
          key="save-share"
          index={3}
          width={width}
          scrollOffset={scrollOffset}
          reduceMotion={reduceMotion}
        >
          <SaveShareSlide isActive={activeIndex === 3} reduceMotion={reduceMotion} />
        </OnboardingPage>
        <OnboardingPage
          key="ready"
          index={4}
          width={width}
          scrollOffset={scrollOffset}
          reduceMotion={reduceMotion}
        >
          <ReadySlide isActive={activeIndex === 4} reduceMotion={reduceMotion} />
        </OnboardingPage>
      </AnimatedPagerView>

      <View
        style={[
          styles.footer,
          {
            paddingTop: isLastSlide ? spacing.xl : spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <OnboardingDots
          count={ONBOARDING_SLIDE_COUNT}
          scrollOffset={scrollOffset}
          pageWidth={width}
        />

        {isLastSlide ? (
          <View style={styles.finalActions}>
            <AppButton
              title={t('onboarding.actions.getStarted')}
              onPress={() => void finishOnboarding()}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.actions.skip')}
              hitSlop={10}
              onPress={() => void finishOnboarding()}
              style={styles.finalSkipPressable}
            >
              <Text style={[styles.skipLabel, { color: colors.primary }]}>
                {t('onboarding.actions.skip')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <AppButton
            title={
              activeIndex === 0
                ? t('onboarding.actions.continue')
                : t('onboarding.actions.next')
            }
            onPress={goNext}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: 'flex-end',
    minHeight: 44,
  },
  skipPressable: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipLabel: {
    ...typography.button,
    fontSize: 15,
    lineHeight: 20,
    backgroundColor: 'transparent',
  },
  skipPlaceholder: {
    height: 36,
  },
  pager: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  finalActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  finalSkipPressable: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
});
