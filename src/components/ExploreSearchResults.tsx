import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { duration, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { Place } from '../types/place';

import { PlaceListCard } from './PlaceListCard';
import { ProfileGridItem } from './ProfileGridItem';
import { SearchResultsSkeleton } from './Skeleton';

const calmEasing = Easing.out(Easing.cubic);
const MAX_VISIBLE_RESULTS = 12;
const keyExtractor = (item: Place) => item.id;

interface ExploreSearchResultsProps {
  visible: boolean;
  query: string;
  results: Place[];
  loading?: boolean;
  recentSearches: string[];
  maxPanelHeight?: number;
  onSelectPlace: (placeId: string) => void;
  onSelectRecent: (query: string) => void;
  onRemoveRecent: (query: string) => void;
}

export function ExploreSearchResults({
  visible,
  query,
  results,
  loading = false,
  recentSearches,
  maxPanelHeight = 320,
  onSelectPlace,
  onSelectRecent,
  onRemoveRecent,
}: ExploreSearchResultsProps) {
  const listMaxHeight = Math.max(120, maxPanelHeight - spacing.lg);
  const { colors, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const trimmed = query.trim();
  const showRecent = trimmed.length === 0 && recentSearches.length > 0;
  const showResults = trimmed.length > 0;
  const visibleResults = useMemo(
    () => results.slice(0, MAX_VISIBLE_RESULTS),
    [results],
  );

  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration.fast,
          easing: calmEasing,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 6,
          duration: duration.fast,
          easing: calmEasing,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible, trimmed, showRecent]);

  if (!visible || (!showRecent && !showResults)) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          maxHeight: maxPanelHeight,
          opacity,
          transform: [{ translateY }],
          ...shadows.md,
        },
      ]}
    >
      {showRecent ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent</Text>
          {recentSearches.map((item, index) => (
            <RecentSearchRow
              key={item}
              index={index}
              label={item}
              onPress={() => onSelectRecent(item)}
              onRemove={() => onRemoveRecent(item)}
            />
          ))}
        </View>
      ) : null}

      {showResults && loading ? (
        <View style={styles.section}>
          <SearchResultsSkeleton count={3} />
        </View>
      ) : null}

      {showResults && !loading && visibleResults.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No places found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Try another name, category, or clear filters.
          </Text>
        </View>
      ) : null}

      {showResults && !loading && visibleResults.length > 0 ? (
        <SearchResultsList
          results={visibleResults}
          listMaxHeight={listMaxHeight}
          onSelectPlace={onSelectPlace}
        />
      ) : null}
    </Animated.View>
  );
}

function SearchResultsList({
  results,
  listMaxHeight,
  onSelectPlace,
}: {
  results: Place[];
  listMaxHeight: number;
  onSelectPlace: (placeId: string) => void;
}) {
  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item, index }) => (
      <ProfileGridItem index={index}>
        <PlaceListCard place={item} compact onPressId={onSelectPlace} />
      </ProfileGridItem>
    ),
    [onSelectPlace],
  );

  return (
    <FlatList
      data={results}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={[styles.list, { maxHeight: listMaxHeight }]}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews
    />
  );
}

function RecentSearchRow({
  label,
  index,
  onPress,
  onRemove,
}: {
  label: string;
  index: number;
  onPress: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        delay: index * 30,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: duration.normal,
        delay: index * 30,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateX]);

  const handleRemove = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 12,
        duration: duration.fast,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onRemove();
      }
    });
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <Pressable
        onPress={onPress}
        style={styles.recentRow}
        accessibilityRole="button"
        accessibilityLabel={`Search ${label}`}
      >
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.recentLabel, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          onPress={handleRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  section: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  list: {},
  listContent: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.label,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recentLabel: {
    ...typography.bodySmall,
    flex: 1,
  },
});
