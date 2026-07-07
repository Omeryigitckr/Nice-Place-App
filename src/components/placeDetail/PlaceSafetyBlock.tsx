import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';

interface PlaceSafetyBlockProps {
  safetyNote: string;
}

export function PlaceSafetyBlock({ safetyNote }: PlaceSafetyBlockProps) {
  const colors = useThemeColors();
  const trimmed = safetyNote.trim();

  if (!trimmed) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Safety tips</Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{trimmed}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  body: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
});
