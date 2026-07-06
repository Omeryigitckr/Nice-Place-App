import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
}

export function SectionHeader({ title, subtitle, count }: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {count !== undefined ? (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primaryBorder,
              },
            ]}
          >
            <Text style={[styles.countText, { color: colors.primary }]}>{count}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
  },
  subtitle: {
    ...typography.bodySmall,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});
