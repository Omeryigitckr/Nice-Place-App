import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import { onboardingSlides } from '../../../constants/onboardingSlides';
import { spacing, typography } from '../../../theme';
import { useTheme } from '../../../theme/ThemeContext';
import { OnboardingBackground } from '../OnboardingBackground';
import { onboardingAssets } from '../onboardingAssets';
import { PhoneMockup } from '../PhoneMockup';
import { getPhoneMockupSize, getSplitMockupWidth } from '../mockupSizing';
import { useFloatingMotion, useSlideEntrance } from '../useOnboardingMotion';

interface SaveShareSlideProps {
  isActive: boolean;
  reduceMotion: boolean;
}

export function SaveShareSlide({ isActive, reduceMotion }: SaveShareSlideProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const slide = onboardingSlides[3];

  const mockupSize = getPhoneMockupSize(getSplitMockupWidth(width));
  const textStyle = useSlideEntrance(isActive, reduceMotion, 60);
  const leftFloatStyle = useFloatingMotion(isActive, reduceMotion, 4);
  const rightFloatStyle = useFloatingMotion(isActive, reduceMotion, 5);

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.visual}>
        <Animated.View style={[styles.mockupLeft, leftFloatStyle]}>
          <PhoneMockup
            source={onboardingAssets.saved}
            size={mockupSize}
            isActive={isActive}
            reduceMotion={reduceMotion}
            floating={false}
            animateEntrance
          />
        </Animated.View>

        <Animated.View style={[styles.mockupRight, rightFloatStyle]}>
          <PhoneMockup
            source={onboardingAssets.addPlace}
            size={mockupSize}
            isActive={isActive}
            reduceMotion={reduceMotion}
            floating={false}
            animateEntrance
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={[styles.headline, { color: colors.textPrimary }]}>{t(slide.headlineKey)}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(slide.subtitleKey)}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  visual: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  mockupLeft: {
    transform: [{ rotate: '-4deg' }],
    marginTop: spacing.xl,
  },
  mockupRight: {
    transform: [{ rotate: '4deg' }],
    marginTop: -spacing.xl,
  },
  textBlock: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    maxWidth: 340,
  },
  headline: {
    ...typography.h1,
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 26,
  },
});
