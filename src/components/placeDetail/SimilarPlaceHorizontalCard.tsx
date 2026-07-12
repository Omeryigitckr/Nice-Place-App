import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryKeyListsEqual } from '../../constants/placeCategories';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Place } from '../../types/place';
import { CachedImage } from '../CachedImage';
import { getPlacePrimaryCategoryLabel } from '../PlaceCategoryChips';
import { PlaceSaveButton } from '../PlaceSaveButton';

interface SimilarPlaceHorizontalCardProps {
  place: Place;
  onPress?: () => void;
  onPressId?: (placeId: string) => void;
  showSaveAction?: boolean;
  onRequiresAuth?: () => void;
  onSaveCountChange?: (saveCount: number) => void;
}

function SimilarPlaceHorizontalCardComponent({
  place,
  onPress,
  onPressId,
  showSaveAction = true,
  onRequiresAuth,
  onSaveCountChange,
}: SimilarPlaceHorizontalCardProps) {
  const { colors, shadows } = useTheme();

  const handlePress = useCallback(() => {
    onPress?.();
    onPressId?.(place.id);
  }, [onPress, onPressId, place.id]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadows.sm,
        },
        pressed && styles.pressed,
      ]}
    >
      <CachedImage
        uri={place.image}
        width="100%"
        height={96}
        borderRadius={0}
        recyclingKey={place.id}
        priority="low"
      />
      {showSaveAction ? (
        <View style={styles.saveButtonWrap}>
          <PlaceSaveButton
            placeId={place.id}
            saveCount={place.saveCount}
            onRequiresAuth={onRequiresAuth}
            onSaveCountChange={onSaveCountChange}
            compact
            showLabel={false}
          />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.primary }]} numberOfLines={1}>
          {getPlacePrimaryCategoryLabel(place)}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {place.title}
        </Text>
        <View style={styles.meta}>
          <Ionicons name="navigate-outline" size={11} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {place.distance}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function areSimilarPlacePropsEqual(
  prev: SimilarPlaceHorizontalCardProps,
  next: SimilarPlaceHorizontalCardProps,
): boolean {
  return (
    prev.place.id === next.place.id &&
    prev.place.title === next.place.title &&
    prev.place.image === next.place.image &&
    prev.place.distance === next.place.distance &&
    prev.place.category === next.place.category &&
    categoryKeyListsEqual(prev.place.categories, next.place.categories) &&
    prev.onPress === next.onPress &&
    prev.onPressId === next.onPressId &&
    prev.showSaveAction === next.showSaveAction &&
    prev.onRequiresAuth === next.onRequiresAuth &&
    prev.onSaveCountChange === next.onSaveCountChange
  );
}

export const SimilarPlaceHorizontalCard = memo(
  SimilarPlaceHorizontalCardComponent,
  areSimilarPlacePropsEqual,
);

const styles = StyleSheet.create({
  card: {
    width: 156,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  content: {
    padding: spacing.sm,
    gap: 4,
  },
  category: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.label,
    fontSize: 13,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    fontSize: 11,
  },
  saveButtonWrap: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
});
