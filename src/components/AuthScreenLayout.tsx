import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, spacing } from '../theme';

import { AuthBrandHeader } from './AuthBrandHeader';
import { ScreenContainer } from './ScreenContainer';

interface AuthScreenLayoutProps {
  children: ReactNode;
}

const LOGO_INITIAL_SCALE = 0.96;
const LOGO_TRANSLATE_Y = 8;
const calmEasing = Easing.out(Easing.cubic);

/**
 * Shared auth screen shell: branded header entrance + keyboard-safe form area.
 * Safe-area top/bottom come from ScreenContainer — never override paddingTop here
 * or the logo will sit under the notch / punch-hole camera.
 */
export function AuthScreenLayout({ children }: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(LOGO_INITIAL_SCALE)).current;
  const logoTranslateY = useRef(new Animated.Value(LOGO_TRANSLATE_Y)).current;

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
      logoOpacity.setValue(1);
      logoScale.setValue(1);
      logoTranslateY.setValue(0);
      return;
    }

    logoOpacity.setValue(0);
    logoScale.setValue(LOGO_INITIAL_SCALE);
    logoTranslateY.setValue(LOGO_TRANSLATE_Y);

    const animation = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => {
      animation.stop();
    };
  }, [logoOpacity, logoScale, logoTranslateY, reduceMotion]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, spacing.sm) : 0}
    >
      <ScreenContainer
        scrollable
        keyboardAware
        safeTop
        safeBottom
        topExtra={spacing.md}
        bottomExtra={spacing.md}
        contentStyle={styles.content}
      >
        <Animated.View
          style={[
            styles.brand,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
            },
          ]}
        >
          <AuthBrandHeader />
        </Animated.View>

        {children}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
  },
});
