import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

export interface QuickInfoItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface PlaceQuickInfoCardProps {
  items: QuickInfoItem[];
}

export function PlaceQuickInfoCard({ items }: PlaceQuickInfoCardProps) {
  const { colors, shadows } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              ...shadows.sm,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={item.icon} size={16} color={colors.primary} />
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>{item.label}</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  card: {
    width: 108,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    ...typography.label,
    fontSize: 13,
  },
});
