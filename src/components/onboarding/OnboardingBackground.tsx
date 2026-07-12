import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/ThemeContext';

interface OnboardingBackgroundProps {
  /** Kept for call-site compatibility; decoration is intentionally unused. */
  variant?: 'default' | 'brand';
}

/** Plain theme background only — no glows, blobs, or decorative shapes. */
export function OnboardingBackground(_props: OnboardingBackgroundProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
      pointerEvents="none"
    />
  );
}
