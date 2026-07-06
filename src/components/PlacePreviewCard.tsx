import { Ionicons } from '@expo/vector-icons';
import { memo, ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { duration, iconSizes, radius, shadows, spacing, typography } from '../theme';
import { darkColors } from '../theme/palettes';
import { Place } from '../types/place';

import { CachedImage } from './CachedImage';

/** Map overlay UI stays dark in both themes for premium map contrast. */
const colors = darkColors;

const IMAGE_HEIGHT = 148;
const SHEET_MS = 240;
const PRESS_SCALE = 0.97;
const DISMISS_DISTANCE = 96;
const calmEasing = Easing.out(Easing.cubic);

interface PlacePreviewCardProps {
  place: Place;
  visible?: boolean;
  saved?: boolean;
  saveDisabled?: boolean;
  onSave?: () => void;
  liked?: boolean;
  likeCount?: number;
  likeDisabled?: boolean;
  onLike?: () => void;
  onClose?: () => void;
  onHidden?: () => void;
  onDetails: () => void;
  onNavigate?: () => void;
  discoveredBy?: string | null;
}

function PlacePreviewCardComponent({
  place,
  visible = true,
  saved = false,
  saveDisabled = false,
  onSave,
  liked = false,
  likeCount,
  likeDisabled = false,
  onLike,
  onClose,
  onHidden,
  onDetails,
  onNavigate,
  discoveredBy,
}: PlacePreviewCardProps) {
  const displayLikeCount = Math.max(0, likeCount ?? place.likeCount);
  const sheetY = useRef(new Animated.Value(32)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const revealImage = useRef(new Animated.Value(0)).current;
  const revealMeta = useRef(new Animated.Value(0)).current;
  const revealActions = useRef(new Animated.Value(0)).current;
  const likePop = useRef(new Animated.Value(1)).current;
  const savePop = useRef(new Animated.Value(1)).current;
  const closingRef = useRef(false);

  const runContentReveal = () => {
    revealImage.setValue(0);
    revealMeta.setValue(0);
    revealActions.setValue(0);

    Animated.stagger(36, [
      Animated.timing(revealImage, {
        toValue: 1,
        duration: 180,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(revealMeta, {
        toValue: 1,
        duration: 180,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(revealActions, {
        toValue: 1,
        duration: 180,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOpen = () => {
    closingRef.current = false;
    dragY.setValue(0);
    sheetY.setValue(32);
    sheetOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: SHEET_MS,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 0,
        duration: SHEET_MS,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();

    runContentReveal();
  };

  const animateClose = (onDone?: () => void) => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: SHEET_MS,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 28,
        duration: SHEET_MS,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 0,
        duration: SHEET_MS,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onDone?.();
        onHidden?.();
      }
      closingRef.current = false;
    });
  };

  useEffect(() => {
    if (visible) {
      animateOpen();
      return;
    }

    animateClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/close driven only by visibility
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    runContentReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content refresh on place change
  }, [place.id, place.image, visible]);

  useEffect(() => {
    if (!liked) {
      return;
    }
    Animated.sequence([
      Animated.timing(likePop, {
        toValue: 1.12,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(likePop, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [likePop, liked]);

  useEffect(() => {
    if (!saved) {
      return;
    }
    Animated.sequence([
      Animated.timing(savePop, {
        toValue: 1.1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(savePop, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [savePop, saved]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            dragY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_DISTANCE || gesture.vy > 1.1) {
            onClose?.();
            return;
          }

          Animated.spring(dragY, {
            toValue: 0,
            damping: 20,
            stiffness: 280,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 20,
            stiffness: 280,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, onClose],
  );

  const handleClose = () => {
    onClose?.();
  };

  const translateY = Animated.add(sheetY, dragY);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: sheetOpacity,
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleHit}>
        <View style={styles.handle} />
      </View>

      <Pressable onPress={onDetails} style={styles.card}>
        <Animated.View
          style={[
            styles.imageSection,
            {
              opacity: revealImage,
              transform: [
                {
                  translateY: revealImage.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.image}>
            <CachedImage
              uri={place.image}
              style={StyleSheet.absoluteFill}
              borderRadius={0}
              recyclingKey={place.id}
              priority="high"
              transitionMs={120}
            />
          </View>
          <View style={styles.imageScrim} />
          {onClose ? (
            <PreviewActionButton
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="Close place preview"
            >
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </PreviewActionButton>
          ) : null}
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: revealMeta,
              transform: [
                {
                  translateY: revealMeta.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {place.category}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {place.title}
          </Text>

          <View style={styles.meta}>
            <MetaItem icon="navigate-outline" label={place.distance} />
            <MetaDivider />
            <MetaItem icon="trail-sign-outline" label={place.difficulty} />
            <MetaDivider />
            <MetaItem icon="sunny-outline" label={place.bestTime} />
          </View>

          {discoveredBy ? (
            <Text style={styles.discoveredBy} numberOfLines={1}>
              Discovered by @{discoveredBy}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View
          style={[
            styles.actionsWrap,
            {
              opacity: revealActions,
              transform: [
                {
                  translateY: revealActions.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.actions}>
            {onLike ? (
              <Animated.View style={[styles.actionFlex, { transform: [{ scale: likePop }] }]}>
                <PreviewActionButton
                  onPress={onLike}
                  disabled={likeDisabled}
                  style={[
                    styles.actionButton,
                    liked && styles.actionButtonActive,
                    likeDisabled && styles.actionButtonDisabled,
                  ]}
                  accessibilityLabel={liked ? 'Unlike place' : 'Like place'}
                >
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={liked ? colors.primary : colors.textPrimary}
                  />
                  <Text style={[styles.actionLabel, liked && styles.actionLabelActive]}>
                    {`${displayLikeCount}`}
                  </Text>
                </PreviewActionButton>
              </Animated.View>
            ) : null}
            {onSave ? (
              <Animated.View style={[styles.actionFlex, { transform: [{ scale: savePop }] }]}>
                <PreviewActionButton
                  onPress={onSave}
                  disabled={saveDisabled}
                  style={[
                    styles.actionButton,
                    saved && styles.actionButtonActive,
                    saveDisabled && styles.actionButtonDisabled,
                  ]}
                  accessibilityLabel={saved ? 'Remove from saved' : 'Save place'}
                >
                  <Ionicons
                    name={saved ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color={saved ? colors.primary : colors.textPrimary}
                  />
                  <Text style={[styles.actionLabel, saved && styles.actionLabelActive]}>
                    {saved ? 'Saved' : 'Save'}
                  </Text>
                </PreviewActionButton>
              </Animated.View>
            ) : null}
            {onNavigate ? (
              <View style={styles.actionFlex}>
                <PreviewActionButton
                  onPress={onNavigate}
                  style={[styles.actionButton, styles.navigateButton]}
                  accessibilityLabel="Navigate to place"
                >
                  <Ionicons name="navigate" size={16} color={colors.white} />
                  <Text style={styles.navigateLabel}>Navigate</Text>
                </PreviewActionButton>
              </View>
            ) : (
              <View style={styles.actionFlex}>
                <PreviewActionButton
                  onPress={onDetails}
                  style={[styles.actionButton, styles.navigateButton]}
                  accessibilityLabel="View details"
                >
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                  <Text style={styles.navigateLabel}>Details</Text>
                </PreviewActionButton>
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const PlacePreviewCard = memo(PlacePreviewCardComponent);

function PreviewActionButton({
  children,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 20,
      stiffness: 360,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (!disabled) {
            animatePress(PRESS_SCALE);
          }
        }}
        onPressOut={() => animatePress(1)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.actionPressable}
        hitSlop={8}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export const PLACE_PREVIEW_CARD_HEIGHT = IMAGE_HEIGHT + 188;

function MetaItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={iconSizes.xs} color={colors.textMuted} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function MetaDivider() {
  return <View style={styles.metaDivider} />;
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  handleHit: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
  },
  card: {
    overflow: 'hidden',
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.xl,
    ...shadows.lg,
  },
  imageSection: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
  },
  imageScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 10, 16, 0.18)',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.scrimHeavy,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  categoryBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  verifiedText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    ...typography.subtitle,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  discoveredBy: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionsWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
  actionPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    width: '100%',
  },
  actionButton: {
    width: '100%',
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  actionButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorderStrong,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionLabelActive: {
    color: colors.primary,
  },
  navigateButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  navigateLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
});
