import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';

interface PlaceTagPillProps {
  label: string;
}

export function PlaceTagPill({ label }: PlaceTagPillProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.chipBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: {
    ...typography.chip,
    fontSize: 12,
  },
});
