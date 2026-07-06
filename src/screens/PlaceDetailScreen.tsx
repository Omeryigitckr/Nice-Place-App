import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  CreatorAttributionRow,
  PlaceDetailSkeleton,
  ProfileEntranceBlock,
} from '../components';
import { AuthRequiredModal } from '../components/AuthRequiredModal';
import { FeedbackModal } from '../components/FeedbackModal';
import {
  PlaceDescriptionBlock,
  PlaceDetailHero,
  PlaceDetailStickyActions,
  PLACE_DETAIL_STICKY_ACTIONS_HEIGHT,
  PlacePhotoGallery,
  PlacePhotoViewer,
  PlaceQuickInfoCard,
  PlaceTagPill,
  QuickInfoItem,
  SimilarPlaceHorizontalCard,
} from '../components/placeDetail';
import { readPlaceFromAnyCache, readPlacesListCache } from '../cache';
import { MAP_ROUTES } from '../constants';
import { showAppToast } from '../feedback';
import {
  useAdminAccess,
  useAppSettings,
  useAuth,
  useFloatingTabBarInset,
  useNetworkStatus,
  usePlaceLikes,
  useSavedPlaces,
  useUserLocation,
} from '../hooks';
import { getApprovedPlaces, getPlaceDetail, softDeletePlace } from '../services';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { MapStackParamList } from '../types';
import { CrowdLevel, Difficulty, Place } from '../types/place';
import { PublicProfileSummary } from '../types/publicProfile';
import {
  getSimilarPlaces,
  openExternalDirections,
  withPlaceDistance,
  withPlaceDistances,
} from '../utils';
import { navigateToAuth, requireAuth } from '../utils/authGuard';

type Props = NativeStackScreenProps<MapStackParamList, typeof MAP_ROUTES.PLACE_DETAIL>;

const ACCESS_LABELS: Record<Place['accessType'], string> = {
  walking: 'Walking',
  driving: 'Driving',
  public_transport: 'Public transport',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

const CROWD_LABELS: Record<CrowdLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

function buildDisplayTags(place: Place): string[] {
  const tags = new Set<string>();

  for (const tag of place.tags) {
    const formatted = tag
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    tags.add(formatted);
  }

  if (place.isPetFriendly) tags.add('Pet Friendly');
  if (place.isChildFriendly) tags.add('Family Friendly');
  if (place.isCampAllowed) tags.add('Camping');
  if (place.isPicnicSuitable) tags.add('Picnic');

  return Array.from(tags);
}

function buildQuickInfoItems(place: Place): QuickInfoItem[] {
  return [
    { icon: 'navigate-outline', label: 'Distance', value: place.distance },
    { icon: 'time-outline', label: 'Best Time', value: place.bestTime },
    { icon: 'footsteps-outline', label: 'Difficulty', value: DIFFICULTY_LABELS[place.difficulty] },
    { icon: 'car-outline', label: 'Access', value: ACCESS_LABELS[place.accessType] },
    { icon: 'people-outline', label: 'Crowd', value: CROWD_LABELS[place.crowdLevel] },
  ];
}

export function PlaceDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useFloatingTabBarInset();
  const placeId = route.params?.placeId;
  const [place, setPlace] = useState<Place | null>(null);
  const [creator, setCreator] = useState<PublicProfileSummary | null>(null);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { isOffline } = useNetworkStatus();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { settings } = useAppSettings();
  const [adminDeleteVisible, setAdminDeleteVisible] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const {
    isSaved,
    getSaveCount,
    isToggling: isSaveToggling,
    toggleSave,
  } = useSavedPlaces();
  const {
    isLiked,
    getLikeCount,
    isToggling: isLikeToggling,
    toggleLike,
  } = usePlaceLikes();
  const { location } = useUserLocation();
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState(
    'Sign in to save places to your collection.',
  );
  const saved = place ? isSaved(place.id) : false;
  const liked = place ? isLiked(place.id) : false;
  const likeCount = place ? getLikeCount(place.id, place.likeCount) : 0;
  const saveCount = place ? getSaveCount(place.id, place.saveCount) : 0;
  const likeDisabled = place ? isLikeToggling(place.id) : false;
  const saveDisabled = place ? isSaveToggling(place.id) : false;

  useEffect(() => {
    let mounted = true;

    const loadPlace = async () => {
      setLoading(true);
      setNotFound(false);
      let hasCachedPlace = false;

      const cachedList = placeId
        ? await readPlacesListCache({ allowExpired: true })
        : null;

      if (placeId) {
        const cachedDetail = await readPlaceFromAnyCache(placeId);
        if (!mounted) {
          return;
        }
        if (cachedDetail) {
          hasCachedPlace = true;
          setPlace(cachedDetail.place);
          setCreator(cachedDetail.creator);
          setLoading(false);
        }
        if (cachedList?.length) {
          setAllPlaces(cachedList);
        }
      }

      // Detail is required; full list only if we have no cache for similar places.
      const placeDetail = placeId ? await getPlaceDetail(placeId) : null;
      if (!mounted) {
        return;
      }

      if (!placeDetail) {
        if (!hasCachedPlace) {
          setPlace(null);
          setCreator(null);
          setNotFound(true);
        }
      } else {
        setPlace(placeDetail.place);
        setCreator(placeDetail.creator);
      }

      if (cachedList?.length) {
        // Refresh list in background without blocking detail.
        void getApprovedPlaces().then((remotePlaces) => {
          if (mounted && remotePlaces?.length) {
            setAllPlaces(remotePlaces);
          }
        });
      } else {
        try {
          const remotePlaces = await getApprovedPlaces();
          if (mounted && remotePlaces?.length) {
            setAllPlaces(remotePlaces);
          }
        } catch {
          // Keep empty similar list.
        }
      }

      setLoading(false);
    };

    void loadPlace();

    return () => {
      mounted = false;
    };
  }, [placeId]);

  const similarPlaces = useMemo(
    () => (place ? getSimilarPlaces(place, allPlaces) : []),
    [place, allPlaces],
  );

  const displayPlace = useMemo(
    () => (place ? withPlaceDistance(place, location) : null),
    [place, location, settings.distanceUnit],
  );

  const openSimilarPlace = useCallback(
    (placeId: string) => {
      navigation.push(MAP_ROUTES.PLACE_DETAIL, { placeId });
    },
    [navigation],
  );

  const similarPlacesWithDistance = useMemo(
    () => withPlaceDistances(similarPlaces, location),
    [similarPlaces, location, settings.distanceUnit],
  );

  const galleryImages = displayPlace ? [displayPlace.image] : [];
  const displayTags = displayPlace ? buildDisplayTags(displayPlace) : [];
  const quickInfoItems = displayPlace ? buildQuickInfoItems(displayPlace) : [];

  const stickyBottomPadding =
    tabBarInset.totalSpace + PLACE_DETAIL_STICKY_ACTIONS_HEIGHT + spacing.sm;

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleShare = async () => {
    if (!displayPlace) {
      return;
    }

    try {
      await Share.share({
        message: `Check out ${displayPlace.title} on Nice Place — ${displayPlace.category}.`,
      });
    } catch {
      // User dismissed share sheet.
    }
  };

  const handleNavigate = async () => {
    if (!displayPlace) {
      return;
    }

    const opened = await openExternalDirections(
      displayPlace.latitude,
      displayPlace.longitude,
      displayPlace.title,
    );
    if (!opened) {
      showAppToast('Could not open Maps. Check that a maps app is installed.', {
        tone: 'error',
      });
    }
  };

  const handleSave = async () => {
    if (!displayPlace || saveDisabled) {
      return;
    }

    if (!requireAuth(user, 'save_place')) {
      setAuthPromptMessage('Sign in to save places to your collection.');
      setAuthPromptVisible(true);
      return;
    }

    const result = await toggleSave(displayPlace.id, saveCount);
    if (result.success && typeof result.saveCount === 'number') {
      setPlace((prev) =>
        prev ? { ...prev, saveCount: Math.max(0, result.saveCount ?? prev.saveCount) } : prev,
      );
    }
  };

  const handleLike = async () => {
    if (!displayPlace || likeDisabled) {
      return;
    }

    if (!requireAuth(user, 'like_place')) {
      setAuthPromptMessage('Sign in to like places.');
      setAuthPromptVisible(true);
      return;
    }

    const result = await toggleLike(displayPlace.id, likeCount);
    if (result.success && typeof result.likeCount === 'number') {
      setPlace((prev) =>
        prev ? { ...prev, likeCount: Math.max(0, result.likeCount ?? prev.likeCount) } : prev,
      );
    }
  };

  const handleAdminDelete = async () => {
    if (!displayPlace || !isAdmin || adminDeleting) {
      return;
    }

    setAdminDeleting(true);
    const result = await softDeletePlace(displayPlace.id);
    setAdminDeleting(false);
    setAdminDeleteVisible(false);

    if (!result.success) {
      showAppToast(result.error ?? "Couldn't complete action. Please try again.", {
        tone: 'error',
      });
      return;
    }

    showAppToast('Place removed from public view.', {
      tone: 'success',
      icon: 'checkmark-circle-outline',
    });
    setPlace(null);
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PlaceDetailSkeleton />
      </View>
    );
  }

  if (notFound || !place || !displayPlace) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.notFoundIcon, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons
            name={isOffline ? 'cloud-offline-outline' : 'location-outline'}
            size={28}
            color={colors.textMuted}
          />
        </View>
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
          {isOffline ? 'Unavailable offline' : 'Place not found'}
        </Text>
        <Text style={[styles.notFoundText, { color: colors.textMuted }]}>
          {isOffline
            ? 'This place has not been cached yet. Connect to the internet and try again.'
            : 'This place may have been removed or is not approved yet.'}
        </Text>
        <AppButton title="Go back" onPress={() => navigation.goBack()} fullWidth={false} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{ paddingBottom: stickyBottomPadding }}
      >
        <ProfileEntranceBlock index={0}>
          <PlaceDetailHero
            imageUri={displayPlace.image}
            liked={liked}
            likeDisabled={likeDisabled}
            saved={saved}
            saveDisabled={saveDisabled}
            topInset={insets.top}
            onBack={() => navigation.goBack()}
            onLike={() => {
              void handleLike();
            }}
            onSave={() => {
              void handleSave();
            }}
            onShare={handleShare}
            onImagePress={() => openViewer(0)}
          />
        </ProfileEntranceBlock>

        <View style={styles.body}>
          <ProfileEntranceBlock index={1}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primaryBorder,
                    },
                  ]}
                >
                  <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                    {displayPlace.category}
                  </Text>
                </View>
                <View
                  style={[
                    styles.verifiedBadge,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primaryBorder,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                  <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified</Text>
                </View>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {displayPlace.title}
              </Text>

              <View style={styles.subtitleRow}>
                <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.distance, { color: colors.textSecondary }]}>
                  {displayPlace.distance}
                </Text>
              </View>

              <CreatorAttributionRow
                variant="compact"
                creator={creator}
                onPress={
                  creator
                    ? () =>
                        navigation.navigate(MAP_ROUTES.PUBLIC_PROFILE, {
                          profileId: creator.id,
                        })
                    : undefined
                }
              />
            </View>

            <PlaceQuickInfoCard items={quickInfoItems} />
            <PlaceDescriptionBlock description={displayPlace.description} />

            {displayTags.length > 0 ? (
              <View style={styles.tagsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tags</Text>
                <View style={styles.tags}>
                  {displayTags.map((tag) => (
                    <PlaceTagPill key={tag} label={tag} />
                  ))}
                </View>
              </View>
            ) : null}

            {isAdmin ? (
              <View
                style={[
                  styles.adminActions,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Text style={[styles.adminActionsLabel, { color: colors.textMuted }]}>
                  Admin actions
                </Text>
                <Pressable
                  onPress={() => setAdminDeleteVisible(true)}
                  disabled={adminDeleting}
                  accessibilityRole="button"
                  accessibilityLabel="Delete place from public view"
                  style={[
                    styles.adminDeleteButton,
                    { borderColor: colors.error, backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={[styles.adminDeleteText, { color: colors.error }]}>
                    Remove from public view
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ProfileEntranceBlock>

          <ProfileEntranceBlock index={2}>
            <PlacePhotoGallery images={galleryImages} onImagePress={openViewer} />
          </ProfileEntranceBlock>

          {similarPlacesWithDistance.length > 0 ? (
            <ProfileEntranceBlock index={3}>
              <View style={styles.similarSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Nearby similar places
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.similarScroll}
                >
                  {similarPlacesWithDistance.map((item) => (
                    <SimilarPlaceHorizontalCard
                      key={item.id}
                      place={item}
                      onPressId={openSimilarPlace}
                    />
                  ))}
                </ScrollView>
              </View>
            </ProfileEntranceBlock>
          ) : null}
        </View>
      </ScrollView>

      <PlaceDetailStickyActions
        liked={liked}
        likeCount={likeCount}
        likeDisabled={likeDisabled}
        saved={saved}
        saveDisabled={saveDisabled}
        bottomInset={tabBarInset.totalSpace}
        onNavigate={handleNavigate}
        onLike={() => {
          void handleLike();
        }}
        onSave={() => {
          void handleSave();
        }}
      />

      <PlacePhotoViewer
        images={galleryImages}
        initialIndex={viewerIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
      />

      <AuthRequiredModal
        visible={authPromptVisible}
        message={authPromptMessage}
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />

      {isAdmin ? (
        <FeedbackModal
          visible={adminDeleteVisible}
          variant="error"
          title="Delete this place from public view?"
          subtitle="It will be hidden from the map and public lists. This does not permanently erase the row."
          primaryLabel={adminDeleting ? 'Working…' : 'Delete'}
          onPrimary={() => {
            void handleAdminDelete();
          }}
          secondaryLabel="Cancel"
          onSecondary={() => {
            if (!adminDeleting) {
              setAdminDeleteVisible(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  titleSection: {
    gap: spacing.sm,
    marginTop: -spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  verifiedText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distance: {
    ...typography.bodySmall,
  },
  tagsSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  adminActions: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  adminActionsLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  adminDeleteButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  adminDeleteText: {
    ...typography.caption,
    fontWeight: '600',
  },
  similarSection: {
    gap: spacing.sm,
  },
  similarScroll: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  notFoundIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  notFoundTitle: {
    ...typography.subtitle,
  },
  notFoundText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
