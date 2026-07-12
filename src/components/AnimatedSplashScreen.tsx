import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand } from '../theme/brand';
import { duration, fontFamily, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

/**
 * Official Brand Kit app icon (green mark only — no baked-in black margin).
 * Same artwork as auth; do not replace or redraw.
 */
const BRAND_APP_ICON = require('../../docs/BrandKit/logos/01_App_Icon.png');

/** ~22% corner radius matches modern app-icon rounding. */
const ICON_RADIUS_RATIO = 0.222;
/** ~25% larger than the previous 96–120 range. */
const ICON_SIZE_MIN = 120;
const ICON_SIZE_MAX = 152;
const ICON_SIZE_BASE = 136;
const INITIAL_SCALE = 0.96;
const INITIAL_TRANSLATE_Y = 8;
/** Optical nudge so the logo+title stack reads as true center. */
const CONTENT_NUDGE_Y = -10;

/** Entrance only — keep within 900–1200ms. */
const ENTRANCE_MS = 900;
const HOLD_MS = 160;
const EXIT_MS = 240;
const REDUCED_MOTION_MS = 400;

const easeOut = Easing.out(Easing.cubic);

/** Soft shadow for dark splash only — light theme stays flat (no elevation halo). */
function softIconShadow(isLight: boolean) {
  if (isLight) {
    return {};
  }
  if (Platform.OS === 'android') {
    return { elevation: 5 };
  }
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  };
}

export interface AnimatedSplashScreenProps {
  onFinish: () => void;
  onReady?: () => void;
}

/**
 * Minimal premium splash. Branding is unchanged; motion is subtle only.
 * Light theme: flat logo on design-system background, no tint/shadow artifacts.
 * Dark theme: unchanged soft icon shadow treatment.
 */
export function AnimatedSplashScreen({ onFinish, onReady }: AnimatedSplashScreenProps) {
  const { colors, colorScheme, isThemeReady } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const hasFinished = useRef(false);

  const iconSize = useMemo(() => {
    const scaled = Math.round(windowWidth * 0.34);
    return Math.min(ICON_SIZE_MAX, Math.max(ICON_SIZE_MIN, scaled || ICON_SIZE_BASE));
  }, [windowWidth]);
  const iconRadius = Math.round(iconSize * ICON_RADIUS_RATIO);
  const isLight = colorScheme === 'light';

  const screenOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(INITIAL_SCALE)).current;
  const contentTranslateY = useRef(
    new Animated.Value(INITIAL_TRANSLATE_Y + CONTENT_NUDGE_Y),
  ).current;

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
    if (!isThemeReady) {
      return;
    }
    onReady?.();
  }, [isThemeReady, onReady]);

  useEffect(() => {
    if (!isThemeReady) {
      return;
    }

    let animation: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    const run = () => {
      if (cancelled) {
        return;
      }

      if (reduceMotion) {
        contentOpacity.setValue(1);
        contentScale.setValue(1);
        contentTranslateY.setValue(CONTENT_NUDGE_Y);

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
            toValue: CONTENT_NUDGE_Y,
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
    isThemeReady,
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
      <View style={styles.centerStage}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
            },
          ]}
        >
          {/* Outer wrap carries shadow (dark only); inner clips rounded corners. */}
          <View
            style={[
              styles.iconShadow,
              {
                width: iconSize,
                height: iconSize,
                borderRadius: iconRadius,
                backgroundColor: isLight ? 'transparent' : undefined,
                ...softIconShadow(isLight),
              },
            ]}
          >
            <View
              style={[
                styles.iconClip,
                {
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconRadius,
                  backgroundColor: isLight ? colors.background : 'transparent',
                },
              ]}
            >
              <Image
                source={BRAND_APP_ICON}
                style={{
                  width: iconSize,
                  height: iconSize,
                }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
                accessibilityLabel={brand.name}
              />
            </View>
          </View>

          <Text
            style={[
              styles.brandName,
              {
                color: colors.textPrimary,
                // Light: slightly tighter optical weight against #F7F8FA
                ...(isLight ? { letterSpacing: -0.5 } : null),
              },
            ]}
          >
            {brand.name}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 320,
  },
  iconShadow: {
    backgroundColor: 'transparent',
  },
  iconClip: {
    overflow: 'hidden',
  },
  brandName: {
    ...typography.h1,
    fontFamily: fontFamily.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
