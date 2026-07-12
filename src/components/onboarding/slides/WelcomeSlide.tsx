import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import { onboardingSlides } from '../../../constants/onboardingSlides';
import { spacing, typography } from '../../../theme';
import { useTheme } from '../../../theme/ThemeContext';
import { OnboardingBackground } from '../OnboardingBackground';
import { onboardingAssets } from '../onboardingAssets';
import { useScaleEntrance, useSlideEntrance } from '../useOnboardingMotion';

interface WelcomeSlideProps {
  isActive: boolean;
  reduceMotion: boolean;
}

export function WelcomeSlide({ isActive, reduceMotion }: WelcomeSlideProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const slide = onboardingSlides[0];

  const logoStyle = useScaleEntrance(isActive, reduceMotion, 80);
  const textStyle = useSlideEntrance(isActive, reduceMotion, 220);

  return (
    <View style={styles.container}>
      <OnboardingBackground variant="brand" />

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View
            style={[
              styles.logoShadow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={onboardingAssets.appIcon}
              style={styles.logo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, textStyle]}>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>{t(slide.headlineKey)}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(slide.subtitleKey)}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  content: {
    alignItems: 'center',
    gap: spacing.xxxl,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoShadow: {
    width: 128,
    height: 128,
    borderRadius: Math.round(128 * 0.222),
    overflow: 'hidden',
    borderWidth: 1,
  },
  logo: {
    width: 128,
    height: 128,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 320,
  },
  headline: {
    ...typography.hero,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    lineHeight: 26,
    textAlign: 'center',
  },
});
