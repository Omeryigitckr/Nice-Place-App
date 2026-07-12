import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface SystemSavedCollectionCardProps {
  placeCount: number;
  onPress?: () => void;
}

export function SystemSavedCollectionCard({ placeCount, onPress }: SystemSavedCollectionCardProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadows.sm,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('saved.allSavedPlacesA11y', { count: placeCount })}
    >
      <View style={[styles.coverWrap, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.iconBadge, { backgroundColor: colors.chipActiveBackground, borderColor: colors.border }]}>
          <Ionicons name="bookmark" size={28} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('saved.allSavedPlaces')}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('common.placesCount', { count: placeCount })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  coverWrap: {
    height: 112,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
