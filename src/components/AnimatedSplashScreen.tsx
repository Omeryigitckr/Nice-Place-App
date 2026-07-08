import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand } from '../theme/brand';
import { duration, fontFamily, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

/** Branded app icon — matches native splash / launcher assets. */
const BRAND_APP_ICON = require('../../assets/icon.png');

const ICON_SIZE = 120;
const ICON_RADIUS = 28;
const INITIAL_SCALE = 0.95;
const INITIAL_TRANSLATE_Y = 10;

/** Entrance only — keep within 900–1200ms. */
const ENTRANCE_MS = 1000;
const HOLD_MS = 160;
const EXIT_MS = 280;
const REDUCED_MOTION_MS = 400;

const easeOut = Easing.out(Easing.cubic);

export interface AnimatedSplashScreenProps {
  onFinish: () => void;
  onReady?: () => void;
}

/**
 * Minimal premium splash. Branding is unchanged; motion is subtle only.
 * Uses RN Animated + native driver (Reanimated is not a project dependency).
 */
export function AnimatedSplashScreen({ onFinish, onReady }: AnimatedSplashScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  const hasFinished = useRef(false);

  const screenOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(INITIAL_SCALE)).current;
  const contentTranslateY = useRef(new Animated.Value(INITIAL_TRANSLATE_Y)).current;

  const finish = useCallback(() => {
    if (hasFinished.current) {
      return;
    }
    hasFinished.current = true;
    onFinish();
  }, [onFinish]);

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
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    const run = () => {
      if (cancelled) {
        return;
      }

      if (reduceMotion) {
        contentOpacity.setValue(1);
        contentScale.setValue(1);
        contentTranslateY.setValue(0);

        animation = Animated.sequence([
          Animated.delay(120),
          Animated.timing(screenOpacity, {
            toValue: 0,
            duration: duration.fast,
            easing: easeOut,
            useNativeDriver: true,
          }),
        ]);

        animation.start(({ finished }) => {
          if (finished) {
            finish();
          }
        });
        return;
      }

      // Logo + brand content fade, scale, and rise together (ease-out).
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: ENTRANCE_MS,
            easing: easeOut,
            useNativeDriver: true,
          }),
          Animated.timing(contentScale, {
            toValue: 1,
            duration: ENTRANCE_MS,
            easing: easeOut,
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: ENTRANCE_MS,
            easing: easeOut,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(HOLD_MS),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: easeOut,
          useNativeDriver: true,
        }),
      ]);

      animation.start(({ finished }) => {
        if (finished) {
          finish();
        }
      });
    };

    // One frame so the solid splash background is painted before native splash hides.
    const startTimer = setTimeout(run, 16);
    const fallback = setTimeout(
      finish,
      reduceMotion ? REDUCED_MOTION_MS : ENTRANCE_MS + HOLD_MS + EXIT_MS + 200,
    );

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(fallback);
      animation?.stop();
      contentOpacity.stopAnimation();
      contentScale.stopAnimation();
      contentTranslateY.stopAnimation();
      screenOpacity.stopAnimation();
    };
  }, [
    contentOpacity,
    contentScale,
    contentTranslateY,
    finish,
    reduceMotion,
    screenOpacity,
  ]);

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          opacity: screenOpacity,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      pointerEvents="auto"
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <Image
            source={BRAND_APP_ICON}
            style={styles.icon}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessibilityLabel={brand.name}
          />
        </View>

        <Text style={[styles.brandName, { color: colors.textPrimary }]}>{brand.name}</Text>

        <Text style={[styles.tagline, { color: colors.primary }]}>
          DISCOVER • SHARE • REMEMBER
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 320,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_RADIUS,
    overflow: 'hidden',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_RADIUS,
  },
  brandName: {
    ...typography.h1,
    fontFamily: fontFamily.bold,
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.33,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
