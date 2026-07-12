import { Image } from 'expo-image';
import { ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../theme/ThemeContext';
import { PHONE_FRAME_INSET, PhoneMockupSize } from './mockupSizing';
import { useFloatingMotion, useSlideEntrance } from './useOnboardingMotion';

interface PhoneMockupProps {
  source: ImageSourcePropType;
  size: PhoneMockupSize;
  isActive: boolean;
  reduceMotion: boolean;
  /** Subtle vertical float — translation only, never scale. */
  floating?: boolean;
  /** Fade + translate entrance for the whole mockup. */
  animateEntrance?: boolean;
  style?: ViewStyle;
}

export function PhoneMockup({
  source,
  size,
  isActive,
  reduceMotion,
  floating = true,
  animateEntrance = true,
  style,
}: PhoneMockupProps) {
  const { colors, shadows, colorScheme } = useTheme();
  const isLight = colorScheme === 'light';
  const floatingStyle = useFloatingMotion(isActive && floating, reduceMotion, 5);
  const entranceStyle = useSlideEntrance(animateEntrance ? isActive : true, reduceMotion, 40);
  const frameRadius = Math.round(size.frameWidth * 0.14);
  const screenRadius = Math.max(0, frameRadius - PHONE_FRAME_INSET);

  return (
    <Animated.View style={[animateEntrance ? entranceStyle : undefined, style]}>
      <Animated.View style={floating ? floatingStyle : undefined}>
        <View
          style={[
            styles.frame,
            {
              width: size.frameWidth,
              height: size.frameHeight,
              borderRadius: frameRadius,
              padding: PHONE_FRAME_INSET,
              backgroundColor: isLight ? colors.surface : colors.surfaceSecondary,
              borderColor: colors.border,
              ...(isLight ? shadows.md : shadows.glass),
            },
          ]}
        >
          <View
            style={[
              styles.screenClip,
              {
                width: size.screenWidth,
                height: size.screenHeight,
                borderRadius: screenRadius,
              },
            ]}
          >
            <Image
              source={source}
              style={{ width: size.screenWidth, height: size.screenHeight }}
              contentFit="contain"
              contentPosition="center"
              cachePolicy="memory-disk"
              recyclingKey={`onboarding-mockup-${size.screenWidth}x${size.screenHeight}`}
              transition={0}
              accessible
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  screenClip: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
