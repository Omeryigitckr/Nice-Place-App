import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import { onboardingSlides } from '../../../constants/onboardingSlides';
import { spacing, typography } from '../../../theme';
import { useTheme } from '../../../theme/ThemeContext';
import { OnboardingBackground } from '../OnboardingBackground';
import { onboardingAssets } from '../onboardingAssets';
import { PhoneMockup } from '../PhoneMockup';
import { getPhoneMockupSize, getPrimaryMockupWidth } from '../mockupSizing';
import { useSlideEntrance } from '../useOnboardingMotion';

interface PlaceDetailSlideProps {
  isActive: boolean;
  reduceMotion: boolean;
}

export function PlaceDetailSlide({ isActive, reduceMotion }: PlaceDetailSlideProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const slide = onboardingSlides[2];

  const mockupSize = getPhoneMockupSize(getPrimaryMockupWidth(width));
  const textStyle = useSlideEntrance(isActive, reduceMotion, 120);

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.visual}>
        <PhoneMockup
          source={onboardingAssets.placeDetail}
          size={mockupSize}
          isActive={isActive}
          reduceMotion={reduceMotion}
        />
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
    alignItems: 'center',
    justifyContent: 'center',
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
