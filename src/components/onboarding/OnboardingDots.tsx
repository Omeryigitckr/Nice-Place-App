import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { spacing } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

interface OnboardingDotsProps {
  count: number;
  scrollOffset: SharedValue<number>;
  pageWidth: number;
}

function OnboardingDot({
  index,
  scrollOffset,
  pageWidth,
}: {
  index: number;
  scrollOffset: SharedValue<number>;
  pageWidth: number;
}) {
  const { colors } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const progress = scrollOffset.value / pageWidth;
    const distance = Math.abs(progress - index);
    const width = interpolate(distance, [0, 1], [24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(distance, [0, 1], [1, 0.45], Extrapolation.CLAMP);

    return {
      width,
      opacity,
      backgroundColor: distance < 0.5 ? colors.primary : colors.border,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function OnboardingDots({ count, scrollOffset, pageWidth }: OnboardingDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <OnboardingDot key={index} index={index} scrollOffset={scrollOffset} pageWidth={pageWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
