import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryKeyListsEqual } from '../constants/placeCategories';
import { usePressScale } from '../motion';
import { radius, spacing, touchTarget, typography } from '../theme';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';
import { OwnedPlace } from '../types/place';

import { CachedImage } from './CachedImage';
import { PlaceCategoryChips } from './PlaceCategoryChips';

interface SharedPlaceCardProps {
  place: OwnedPlace;
  onPress?: () => void;
  onPressId?: (placeId: string) => void;
  onEdit?: () => void;
  onEditId?: (placeId: string) => void;
}

function SharedPlaceCardComponent({
  place,
  onPress,
  onPressId,
  onEdit,
  onEditId,
}: SharedPlaceCardProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const canPress = onPress != null || onPressId != null;
  const canEdit = onEdit != null || onEditId != null;
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    pressedScale: motion.scale.cardPress,
    disabled: !canPress,
  });

  const handlePress = useCallback(() => {
    onPress?.();
    onPressId?.(place.id);
  }, [onPress, onPressId, place.id]);

  const handleEdit = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onEdit?.();
      onEditId?.(place.id);
    },
    [onEdit, onEditId, place.id],
  );
  const statusLabel = t(`place.status.${place.status}`);
  const statusColor =
    place.status === 'pending'
      ? colors.warning
      : place.status === 'approved'
        ? colors.primary
        : place.status === 'rejected'
          ? colors.error
          : colors.textMuted;

  return (
    <Animated.View style={[{ width: '100%' }, animatedStyle]}>
      <Pressable
        onPress={canPress ? handlePress : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!canPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...shadows.card,
          },
        ]}
      >
        <View style={styles.imageWrap}>
          <CachedImage
            uri={place.image}
            style={StyleSheet.absoluteFill}
            borderRadius={0}
            recyclingKey={place.id}
            priority="low"
          />
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={[styles.statusText, { color: colors.white }]}>{statusLabel}</Text>
          </View>
          {canEdit ? (
            <Pressable
              onPress={handleEdit}
              hitSlop={touchTarget.hitSlop}
              style={[
                styles.editButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...shadows.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('common.edit') + ` ${place.title}`}
            >
              <Ionicons name="pencil-outline" size={13} color={colors.textPrimary} />
              <Text style={[styles.editText, { color: colors.textPrimary }]}>{t('common.edit')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {place.title}
          </Text>
          <PlaceCategoryChips place={place} maxVisible={2} compact />

          <View style={styles.meta}>
            <MetaItem
              icon="navigate-outline"
              label={place.distance}
              muted={colors.textMuted}
              text={colors.textSecondary}
            />
            <MetaItem
              icon={place.likeCount > 0 ? 'heart' : 'heart-outline'}
              label={`${Math.max(0, place.likeCount)}`}
              muted={place.likeCount > 0 ? colors.primary : colors.textMuted}
              text={place.likeCount > 0 ? colors.primary : colors.textSecondary}
            />
            <MetaItem
              icon={place.saveCount > 0 ? 'bookmark' : 'bookmark-outline'}
              label={`${Math.max(0, place.saveCount)}`}
              muted={place.saveCount > 0 ? colors.primary : colors.textMuted}
              text={place.saveCount > 0 ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function areSharedPlaceCardPropsEqual(
  prev: SharedPlaceCardProps,
  next: SharedPlaceCardProps,
): boolean {
  return (
    prev.place.id === next.place.id &&
    prev.place.title === next.place.title &&
    prev.place.image === next.place.image &&
    prev.place.distance === next.place.distance &&
    prev.place.category === next.place.category &&
    categoryKeyListsEqual(prev.place.categories, next.place.categories) &&
    prev.place.status === next.place.status &&
    prev.place.likeCount === next.place.likeCount &&
    prev.place.saveCount === next.place.saveCount &&
    prev.onPress === next.onPress &&
    prev.onPressId === next.onPressId &&
    prev.onEdit === next.onEdit &&
    prev.onEditId === next.onEditId
  );
}

export const SharedPlaceCard = memo(SharedPlaceCardComponent, areSharedPlaceCardPropsEqual);

function MetaItem({
  icon,
  label,
  muted,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  muted: string;
  text: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={11} color={muted} />
      <Text style={[styles.metaText, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  editButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 28,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    fontSize: 13,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    ...typography.caption,
    fontSize: 10,
  },
});
