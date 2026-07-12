import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import { onboardingSlides } from '../../../constants/onboardingSlides';
import { spacing, typography } from '../../../theme';
import { useTheme } from '../../../theme/ThemeContext';
import { OnboardingBackground } from '../OnboardingBackground';
import { onboardingAssets } from '../onboardingAssets';
import {
  useBreathingMotion,
  useScaleEntrance,
  useSlideEntrance,
} from '../useOnboardingMotion';

interface ReadySlideProps {
  isActive: boolean;
  reduceMotion: boolean;
}

const LOGO_SIZE = 112;

const FEATURE_KEYS = [
  'onboarding.ready.featureDiscover',
  'onboarding.ready.featureSave',
  'onboarding.ready.featureShare',
] as const;

export function ReadySlide({ isActive, reduceMotion }: ReadySlideProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const slide = onboardingSlides[4];

  const logoEntranceStyle = useScaleEntrance(isActive, reduceMotion, 40);
  const breathingStyle = useBreathingMotion(isActive, reduceMotion);
  const copyStyle = useSlideEntrance(isActive, reduceMotion, 160);
  const featuresStyle = useSlideEntrance(isActive, reduceMotion, 240);

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, logoEntranceStyle]}>
          <Animated.View style={breathingStyle}>
            <Image
              source={onboardingAssets.appIcon}
              style={styles.logo}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey="onboarding-ready-logo"
              transition={0}
              accessibilityIgnoresInvertColors
              accessibilityLabel="Nice Place"
            />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.copyBlock, copyStyle]}>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>{t(slide.headlineKey)}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(slide.subtitleKey)}</Text>
        </Animated.View>

        <Animated.View style={[styles.features, featuresStyle]}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: colors.primary }]}>✓</Text>
              <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>{t(key)}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  logoWrap: {
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: Math.round(LOGO_SIZE * 0.222),
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 300,
    marginBottom: spacing.xxxl,
  },
  headline: {
    ...typography.h1,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    lineHeight: 26,
    textAlign: 'center',
  },
  features: {
    gap: spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureCheck: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    width: 18,
    textAlign: 'center',
  },
  featureLabel: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});
