import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ACCESS_TYPE_OPTIONS,
  BEST_TIME_OPTIONS,
  CROWD_LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../constants';
import { AppButton } from './AppButton';
import { FilterChip } from './FilterChip';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { ExploreFilters, EXPLORE_CATEGORY_OPTIONS } from '../utils/placeFilters';

const FILTER_FACILITY_TOGGLES: { key: keyof ExploreFilters; label: string }[] = [
  { key: 'requirePetFriendly', label: 'Pet friendly' },
  { key: 'requireChildFriendly', label: 'Child friendly' },
  { key: 'requireCarAccessible', label: 'Car accessible' },
  { key: 'requireCampAllowed', label: 'Camping allowed' },
  { key: 'requirePicnicSuitable', label: 'Picnic suitable' },
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
          accessibilityLabel="Close filters"
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Filters</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
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
            <FilterSection title="Category" titleColor={colors.textSecondary}>
              <ChipGrid>
                {EXPLORE_CATEGORY_OPTIONS.map((item) => (
                  <FilterChip
                    key={item.value}
                    label={item.label}
                    active={draftFilters.categories.includes(item.value)}
                    onPress={() => toggleListValue('categories', item.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title="Best time" titleColor={colors.textSecondary}>
              <ChipGrid>
                {BEST_TIME_OPTIONS.map((option) => (
                  <FilterChip
                    key={option}
                    label={option}
                    active={draftFilters.bestTimes.includes(option)}
                    onPress={() => toggleListValue('bestTimes', option)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title="Access type" titleColor={colors.textSecondary}>
              <ChipGrid>
                {ACCESS_TYPE_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.accessTypes.includes(option.value)}
                    onPress={() => toggleListValue('accessTypes', option.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title="Difficulty" titleColor={colors.textSecondary}>
              <ChipGrid>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.difficultyLevels.includes(option.value)}
                    onPress={() => toggleListValue('difficultyLevels', option.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title="Crowd level" titleColor={colors.textSecondary}>
              <ChipGrid>
                {CROWD_LEVEL_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.crowdLevels.includes(option.value)}
                    onPress={() => toggleListValue('crowdLevels', option.value)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>

            <FilterSection title="Facilities" titleColor={colors.textSecondary}>
              <ChipGrid>
                {FILTER_FACILITY_TOGGLES.map((item) => (
                  <FilterChip
                    key={item.key}
                    label={item.label}
                    active={Boolean(draftFilters[item.key])}
                    onPress={() => toggleFacility(item.key)}
                  />
                ))}
              </ChipGrid>
            </FilterSection>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <AppButton title="Apply filters" onPress={onApply} />
            <View style={styles.footerRow}>
              <AppButton title="Clear filters" variant="secondary" onPress={onClear} fullWidth={false} />
              <AppButton title="Close" variant="ghost" onPress={onClose} fullWidth={false} />
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
