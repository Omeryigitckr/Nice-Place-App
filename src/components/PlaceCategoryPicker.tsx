import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  MAX_PLACE_CATEGORIES,
  MIN_PLACE_CATEGORIES,
  PLACE_CATEGORY_GROUPS,
  PlaceCategoryKey,
  getPlaceCategoryGroupLabel,
  getPlaceCategoryLabel,
  getPlaceCategoryMeta,
} from '../constants/placeCategories';
import { radius, spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';

import { FilterChip } from './FilterChip';

interface PlaceCategoryPickerProps {
  selected: PlaceCategoryKey[];
  onChange: (next: PlaceCategoryKey[]) => void;
}

export function PlaceCategoryPicker({ selected, onChange }: PlaceCategoryPickerProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const atMax = selected.length >= MAX_PLACE_CATEGORIES;

  const toggle = (key: PlaceCategoryKey) => {
    if (selected.includes(key)) {
      onChange(selected.filter((item) => item !== key));
      return;
    }
    if (atMax) {
      return;
    }
    onChange([...selected, key]);
  };

  const remove = (key: PlaceCategoryKey) => {
    onChange(selected.filter((item) => item !== key));
  };

  return (
    <View style={styles.wrap}>
      {selected.length > 0 ? (
        <View style={styles.selectedWrap}>
          <Text style={[styles.helper, { color: colors.textMuted }]}>
            {t('place.categories.selected', { count: selected.length, max: MAX_PLACE_CATEGORIES })}
          </Text>
          <View style={styles.selectedRow}>
            {selected.map((key) => {
              const meta = getPlaceCategoryMeta(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => remove(key)}
                  style={[
                    styles.selectedChip,
                    { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('place.categories.removeA11y', { label: meta ? getPlaceCategoryLabel(meta.key) : key })}
                >
                  <Text style={styles.selectedEmoji}>{meta?.emoji ?? '📍'}</Text>
                  <Text style={[styles.selectedLabel, { color: colors.primary }]} numberOfLines={1}>
                    {meta ? getPlaceCategoryLabel(meta.key) : key}
                  </Text>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={[styles.helper, { color: colors.textMuted }]}>
          {t('place.categories.selectRange', {
            min: MIN_PLACE_CATEGORIES,
            max: MAX_PLACE_CATEGORIES,
          })}
        </Text>
      )}

      {PLACE_CATEGORY_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>{getPlaceCategoryGroupLabel(group.id)}</Text>
          <View style={styles.grid}>
            {group.categories.map((item) => (
              <FilterChip
                key={item.key}
                label={`${item.emoji} ${getPlaceCategoryLabel(item.key)}`}
                active={selected.includes(item.key)}
                onPress={() => toggle(item.key)}
              />
            ))}
          </View>
        </View>
      ))}

      {atMax ? (
        <Text style={[styles.limitNote, { color: colors.textMuted }]}>
          {t('place.categories.maxReached', { max: MAX_PLACE_CATEGORIES })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  helper: {
    ...typography.caption,
  },
  selectedWrap: {
    gap: spacing.xs,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  selectedEmoji: {
    fontSize: 12,
  },
  selectedLabel: {
    ...typography.caption,
    fontWeight: '600',
    maxWidth: 120,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.label,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  limitNote: {
    ...typography.caption,
  },
});
