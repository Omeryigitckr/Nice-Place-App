import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface OnboardingPageProps {
  index: number;
  width: number;
  scrollOffset: SharedValue<number>;
  reduceMotion: boolean;
  style?: ViewStyle;
  children: ReactNode;
}

/**
 * Page transition uses opacity + subtle horizontal parallax only.
 * No scale — continuous/page-level scaling softens screenshot sharpness on Android.
 */
export function OnboardingPage({
  index,
  width,
  scrollOffset,
  reduceMotion,
  style,
  children,
}: OnboardingPageProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = scrollOffset.value / width;
    const distance = progress - index;
    const translateX = interpolate(
      distance,
      [-1, 0, 1],
      [width * 0.06, 0, -width * 0.06],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(Math.abs(distance), [0, 1], [1, 0.78], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  if (reduceMotion) {
    return (
      <View style={[styles.page, { width }, style]} collapsable={false}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.page, { width }, style, animatedStyle]} collapsable={false}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
});
