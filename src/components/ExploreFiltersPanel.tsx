import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  ACCESS_TYPE_OPTIONS,
  BEST_TIME_OPTIONS,
  CROWD_LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  getAccessTypeLabel,
  getBestTimeLabel,
  getCrowdLevelLabel,
  getDifficultyLabel,
} from '../constants';
import { AppButton } from './AppButton';
import { FilterChip } from './FilterChip';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import {
  getPlaceCategoryGroupLabel,
  getPlaceCategoryLabel,
  PLACE_CATEGORY_GROUPS,
} from '../constants/placeCategories';
import { ExploreFilters } from '../utils/placeFilters';

const FILTER_FACILITY_TOGGLES: {
  key: keyof ExploreFilters;
  labelKey:
    | 'options.facilities.petFriendly'
    | 'options.facilities.childFriendly'
    | 'options.facilities.carAccessible'
    | 'options.facilities.campAllowed'
    | 'options.facilities.picnicSuitable';
}[] = [
  { key: 'requirePetFriendly', labelKey: 'options.facilities.petFriendly' },
  { key: 'requireChildFriendly', labelKey: 'options.facilities.childFriendly' },
  { key: 'requireCarAccessible', labelKey: 'options.facilities.carAccessible' },
  { key: 'requireCampAllowed', labelKey: 'options.facilities.campAllowed' },
  { key: 'requirePicnicSuitable', labelKey: 'options.facilities.picnicSuitable' },
];

interface ExploreFiltersPanelProps {
  visible: boolean;
  draftFilters: ExploreFilters;
  onChange: (filters: ExploreFilters) => void;
  onApply: () => void;
  onClose: () => void;
  onClear: () => void;
}

export function ExploreFiltersPanel({
  visible,
  draftFilters,
  onChange,
  onApply,
  onClose,
  onClear,
}: ExploreFiltersPanelProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const toggleListValue = <T extends string>(key: keyof ExploreFilters, value: T) => {
    const current = draftFilters[key] as T[];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...draftFilters, [key]: next });
  };

  const toggleFacility = (key: keyof ExploreFilters) => {
    onChange({ ...draftFilters, [key]: !draftFilters[key] });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityLabel={t('explore.filters.close')}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('explore.filters.title')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.closeHit}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {PLACE_CATEGORY_GROUPS.map((group) => (
              <FilterSection key={group.id} title={getPlaceCategoryGroupLabel(group.id)} titleColor={colors.textSecondary}>
                <ChipGrid>
                  {group.categories.map((item) => (
                    <FilterChip
                      key={item.key}
                      label={`${item.emoji} ${getPlaceCategoryLabel(item.key)}`}
                      active={draftFilters.categories.includes(item.key)}
                      onPress={() => toggleListValue('categories', item.key)}
                    />
                  ))}
                </ChipGrid>
              </FilterSection>
            ))}

            <FilterSection title={t('explore.filters.bestTime')} titleColor={colors.textSecondary}>
              <ChipGrid>
                {BEST_TIME_OPTIONS.map((option) => (
                  <FilterChip
                    key={option}
                    label={getBestTimeLabel(option)}
                    active={draftFilters.bestTimes.includes(option)}
                    onPress={() => toggleListValue('bestTimes', option)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title={t('explore.filters.accessType')} titleColor={colors.textSecondary}>
              <ChipGrid>
                {ACCESS_TYPE_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={getAccessTypeLabel(option.value)}
                    active={draftFilters.accessTypes.includes(option.value)}
                    onPress={() => toggleListValue('accessTypes', option.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title={t('explore.filters.difficulty')} titleColor={colors.textSecondary}>
              <ChipGrid>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={getDifficultyLabel(option.value)}
                    active={draftFilters.difficultyLevels.includes(option.value)}
                    onPress={() => toggleListValue('difficultyLevels', option.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title={t('explore.filters.crowdLevel')} titleColor={colors.textSecondary}>
              <ChipGrid>
                {CROWD_LEVEL_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={getCrowdLevelLabel(option.value)}
                    active={draftFilters.crowdLevels.includes(option.value)}
                    onPress={() => toggleListValue('crowdLevels', option.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title={t('explore.filters.facilities')} titleColor={colors.textSecondary}>
              <ChipGrid>
                {FILTER_FACILITY_TOGGLES.map((item) => (
                  <FilterChip
                    key={item.key}
                    label={t(item.labelKey)}
                    active={Boolean(draftFilters[item.key])}
                    onPress={() => toggleFacility(item.key)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <AppButton title={t('explore.filters.apply')} onPress={onApply} />
            <View style={styles.footerRow}>
              <AppButton title={t('explore.filters.clear')} variant="secondary" onPress={onClear} fullWidth={false} />
              <AppButton title={t('common.close')} variant="ghost" onPress={onClose} fullWidth={false} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterSection({
  title,
  titleColor,
  children,
}: {
  title: string;
  titleColor: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
      {children}
    </View>
  );
}

function ChipGrid({ children }: { children: ReactNode }) {
  return <View style={styles.chipGrid}>{children}</View>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  closeHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
