import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Animated, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePressScale } from '../motion';
import { useSavePlaceWithCollections } from '../providers/SavePlaceWithCollectionsProvider';
import { iconSizes, radius, spacing, typography } from '../theme';
import { motion } from '../theme/motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { Place } from '../types/place';

import { CachedImage } from './CachedImage';
import { PlaceCategoryChips } from './PlaceCategoryChips';
import { PlaceSaveButton } from './PlaceSaveButton';
import { categoryKeyListsEqual } from '../constants/placeCategories';

const IMAGE_SIZE = 96;
const IMAGE_SIZE_COMPACT = 84;
const IMAGE_SIZE_PUBLIC_PROFILE = 112;

interface PlaceListCardProps {
  place: Place;
  onPress?: () => void;
  /** Prefer over onPress in lists — keeps parent callbacks stable for memo. */
  onPressId?: (placeId: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  onActionId?: (placeId: string) => void;
  saved?: boolean;
  liked?: boolean;
  likeCount?: number;
  likeDisabled?: boolean;
  onLike?: () => void;
  onLikeId?: (placeId: string) => void;
  compact?: boolean;
  /**
   * Public explorer profile approved-places row:
   * larger square photo, no save control, balanced text spacing.
   */
  variant?: 'default' | 'publicProfile';
  showSaveAction?: boolean;
  onRequiresAuth?: () => void;
  onSaveCountChange?: (saveCount: number) => void;
}

function PlaceListCardComponent({
  place,
  onPress,
  onPressId,
  actionLabel,
  onAction,
  onActionId,
  saved = false,
  liked = false,
  likeCount,
  likeDisabled = false,
  onLike,
  onLikeId,
  compact = false,
  variant = 'default',
  showSaveAction = false,
  onRequiresAuth,
  onSaveCountChange,
}: PlaceListCardProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { isSaved: isPlaceSaved } = useSavePlaceWithCollections();
  const isPublicProfile = variant === 'publicProfile';
  const displaySaved = showSaveAction ? isPlaceSaved(place.id) : saved;
  const canPress = onPress != null || onPressId != null;
  const canLike = onLike != null || onLikeId != null;
  const canAction = Boolean(actionLabel) && (onAction != null || onActionId != null);
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    pressedScale: motion.scale.cardPress,
    disabled: !canPress,
  });
  const imageSize = isPublicProfile
    ? IMAGE_SIZE_PUBLIC_PROFILE
    : compact
      ? IMAGE_SIZE_COMPACT
      : IMAGE_SIZE;
  const displayLikeCount = Math.max(0, likeCount ?? place.likeCount);
  const showEngagementMeta = isPublicProfile || !compact || canLike;

  const handlePress = useCallback(() => {
    onPress?.();
    onPressId?.(place.id);
  }, [onPress, onPressId, place.id]);

  const handleLike = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation?.();
      onLike?.();
      onLikeId?.(place.id);
    },
    [onLike, onLikeId, place.id],
  );

  const handleAction = useCallback(() => {
    onAction?.();
    onActionId?.(place.id);
  }, [onAction, onActionId, place.id]);

  return (
    <Animated.View style={animatedStyle}>
    <Pressable
      onPress={canPress ? handlePress : undefined}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.card,
        isPublicProfile && styles.cardPublicProfile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          minHeight: imageSize,
          ...shadows.card,
        },
      ]}
    >
      <View
        style={[
          styles.imageWrap,
          {
            width: imageSize,
            height: imageSize,
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <CachedImage
          uri={place.image}
          width={imageSize}
          height={imageSize}
          borderRadius={0}
          recyclingKey={place.id}
          priority="low"
          contentFit="cover"
        />
        {displaySaved && !showSaveAction && !isPublicProfile ? (
          <View
            style={[
              styles.savedBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="bookmark" size={11} color={colors.primary} />
          </View>
        ) : null}
        {showSaveAction && !isPublicProfile ? (
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
      </View>

      <View style={[styles.content, isPublicProfile && styles.contentPublicProfile]}>
        <Text
          style={[
            styles.title,
            isPublicProfile && styles.titlePublicProfile,
            { color: colors.textPrimary },
          ]}
          numberOfLines={isPublicProfile ? 2 : 1}
        >
          {place.title}
        </Text>
        <PlaceCategoryChips place={place} maxVisible={2} compact />

        <View style={[styles.meta, isPublicProfile && styles.metaPublicProfile]}>
          <MetaItem icon="navigate-outline" label={place.distance} color={colors.textMuted} textColor={colors.textSecondary} />
          <Text style={[styles.metaDivider, { color: colors.textMuted }]}>·</Text>
          <MetaItem icon="time-outline" label={place.bestTime} color={colors.textMuted} textColor={colors.textSecondary} />
          {showEngagementMeta ? (
            <>
              <Text style={[styles.metaDivider, { color: colors.textMuted }]}>·</Text>
              {canLike ? (
                <Pressable
                  onPress={handleLike}
                  disabled={likeDisabled}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={liked ? t('place.a11yUnlike') : t('place.a11yLike')}
                  style={[styles.likeButton, likeDisabled && styles.likeButtonDisabled]}
                >
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={iconSizes.xs}
                    color={liked ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: liked ? colors.primary : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {`${displayLikeCount}`}
                  </Text>
                </Pressable>
              ) : (
                <MetaItem
                  icon={liked ? 'heart' : 'heart-outline'}
                  label={`${displayLikeCount}`}
                  color={liked ? colors.primary : colors.textMuted}
                  textColor={liked ? colors.primary : colors.textSecondary}
                />
              )}
              <Text style={[styles.metaDivider, { color: colors.textMuted }]}>·</Text>
              <MetaItem
                icon={
                  (place.isSavedByCurrentUser ?? displaySaved)
                    ? 'bookmark'
                    : place.saveCount > 0
                      ? 'bookmark'
                      : 'bookmark-outline'
                }
                label={`${Math.max(0, place.saveCount)}`}
                color={
                  (place.isSavedByCurrentUser ?? displaySaved) || place.saveCount > 0
                    ? colors.primary
                    : colors.textMuted
                }
                textColor={
                  (place.isSavedByCurrentUser ?? displaySaved) || place.saveCount > 0
                    ? colors.primary
                    : colors.textSecondary
                }
              />
            </>
          ) : null}
        </View>

        {canAction ? (
          <Pressable onPress={handleAction} style={styles.action}>
            <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
    </Animated.View>
  );
}

function arePlaceListCardPropsEqual(
  prev: PlaceListCardProps,
  next: PlaceListCardProps,
): boolean {
  return (
    prev.place.id === next.place.id &&
    prev.place.title === next.place.title &&
    prev.place.image === next.place.image &&
    prev.place.distance === next.place.distance &&
    prev.place.category === next.place.category &&
    categoryKeyListsEqual(prev.place.categories, next.place.categories) &&
    prev.place.bestTime === next.place.bestTime &&
    prev.place.likeCount === next.place.likeCount &&
    prev.place.saveCount === next.place.saveCount &&
    prev.place.isSavedByCurrentUser === next.place.isSavedByCurrentUser &&
    prev.saved === next.saved &&
    prev.liked === next.liked &&
    prev.likeCount === next.likeCount &&
    prev.likeDisabled === next.likeDisabled &&
    prev.compact === next.compact &&
    prev.variant === next.variant &&
    prev.actionLabel === next.actionLabel &&
    prev.onPress === next.onPress &&
    prev.onPressId === next.onPressId &&
    prev.onLike === next.onLike &&
    prev.onLikeId === next.onLikeId &&
    prev.onAction === next.onAction &&
    prev.onActionId === next.onActionId &&
    prev.showSaveAction === next.showSaveAction &&
    prev.onRequiresAuth === next.onRequiresAuth &&
    prev.onSaveCountChange === next.onSaveCountChange
  );
}

export const PlaceListCard = memo(PlaceListCardComponent, arePlaceListCardPropsEqual);

function MetaItem({
  icon,
  label,
  color,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  textColor: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={iconSizes.xs} color={color} />
      <Text style={[styles.metaText, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: IMAGE_SIZE,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  cardPublicProfile: {
    alignItems: 'stretch',
  },
  imageWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  savedBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonWrap: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 4,
    justifyContent: 'center',
  },
  contentPublicProfile: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 15,
    lineHeight: 20,
  },
  titlePublicProfile: {
    fontSize: 16,
    lineHeight: 21,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  category: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  metaPublicProfile: {
    marginTop: 0,
    gap: spacing.xs,
    rowGap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '46%',
    flexShrink: 1,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  likeButtonDisabled: {
    opacity: 0.55,
  },
  metaText: {
    ...typography.caption,
    fontSize: 10,
  },
  metaDivider: {
    fontSize: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  actionText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
