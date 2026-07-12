import { StyleSheet, Text, View } from 'react-native';

import {
  formatCategoryDisplayLabels,
  getPlaceCategoryLabel,
  getPlaceCategoryMeta,
  getPrimaryPlaceCategory,
  resolvePlaceCategoryKeys,
} from '../constants/placeCategories';
import { radius, spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { Place } from '../types/place';

interface PlaceCategoryChipsProps {
  place: Pick<Place, 'categories' | 'categorySlug' | 'category'>;
  /** Max chips before +N (default 3 for cards, use higher for detail). */
  maxVisible?: number;
  compact?: boolean;
  showEmoji?: boolean;
}

export function PlaceCategoryChips({
  place,
  maxVisible = 3,
  compact = false,
  showEmoji = true,
}: PlaceCategoryChipsProps) {
  const colors = useThemeColors();
  const keys = resolvePlaceCategoryKeys(place);
  const labels = formatCategoryDisplayLabels(keys);
  const visibleCount = Math.max(1, maxVisible);
  const visibleKeys = keys.slice(0, visibleCount);
  const extraCount = Math.max(0, keys.length - visibleCount);

  if (visibleKeys.length === 0) {
    return null;
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {visibleKeys.map((key, index) => {
        const meta = getPlaceCategoryMeta(key);
        const label = labels[index] ?? getPlaceCategoryLabel(key) ?? place.category;
        return (
          <View
            key={`${key}-${index}`}
            style={[
              styles.chip,
              compact ? styles.chipCompact : null,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primaryBorder,
              },
            ]}
          >
            {showEmoji && meta?.emoji ? (
              <Text style={styles.emoji}>{meta.emoji}</Text>
            ) : null}
            <Text
              style={[
                compact ? styles.chipTextCompact : styles.chipText,
                { color: colors.primary },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        );
      })}
      {extraCount > 0 ? (
        <View
          style={[
            styles.chip,
            compact ? styles.chipCompact : null,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          ]}
        >
          <Text style={[compact ? styles.chipTextCompact : styles.chipText, { color: colors.textSecondary }]}>
            +{extraCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function getPlacePrimaryCategoryLabel(place: Pick<Place, 'categories' | 'categorySlug' | 'category'>): string {
  const primary = getPrimaryPlaceCategory(place);
  return getPlaceCategoryLabel(primary) || place.category;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  rowCompact: {
    flexWrap: 'nowrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipCompact: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    flexShrink: 1,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextCompact: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 11,
  },
});
