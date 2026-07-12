import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

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
  PlaceDetailHeroCarousel,
  PlaceDetailStickyActions,
  PLACE_DETAIL_STICKY_ACTIONS_HEIGHT,
  PlacePhotoViewer,
  PlaceQuickInfoCard,
  PlaceSafetyBlock,
  PlaceTagPill,
  QuickInfoItem,
  SimilarPlaceHorizontalCard,
} from '../components/placeDetail';
import { PlaceCategoryChips, getPlacePrimaryCategoryLabel } from '../components/PlaceCategoryChips';
import {
  getAccessTypeLabel,
  getBestTimeLabel,
  getCrowdLevelLabel,
  getDifficultyLabel,
  getFacilityLabel,
} from '../constants/addPlaceOptions';
import { getPlaceCategoryLabel } from '../constants/placeCategories';
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
  useUserLocation,
} from '../hooks';
import { useSavePlaceWithCollections } from '../providers/SavePlaceWithCollectionsProvider';
import { getApprovedPlaces, getPlaceDetail, softDeletePlace } from '../services';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { MapStackParamList } from '../types';
import { Place } from '../types/place';
import { PublicProfileSummary } from '../types/publicProfile';
import {
  getSimilarPlaces,
  openExternalDirections,
  withPlaceDistance,
  withPlaceDistances,
} from '../utils';
import { navigateToAuth, requireAuth } from '../utils/authGuard';

type Props = NativeStackScreenProps<MapStackParamList, typeof MAP_ROUTES.PLACE_DETAIL>;

function buildDisplayTags(place: Place): string[] {
  const tags = new Set<string>();

  for (const key of place.categories) {
    tags.add(getPlaceCategoryLabel(key));
  }

  if (place.isPetFriendly) tags.add(getFacilityLabel('isPetFriendly'));
  if (place.isChildFriendly) tags.add(getFacilityLabel('isChildFriendly'));
  if (place.isCampAllowed) tags.add(getFacilityLabel('isCampAllowed'));
  if (place.isPicnicSuitable) tags.add(getFacilityLabel('isPicnicSuitable'));

  return Array.from(tags);
}

function buildQuickInfoItems(
  place: Place,
  labels: {
    distance: string;
    bestTime: string;
    difficulty: string;
    access: string;
    crowd: string;
  },
): QuickInfoItem[] {
  return [
    { icon: 'navigate-outline', label: labels.distance, value: place.distance },
    {
      icon: 'time-outline',
      label: labels.bestTime,
      value: getBestTimeLabel(place.bestTime),
    },
    {
      icon: 'footsteps-outline',
      label: labels.difficulty,
      value: getDifficultyLabel(place.difficultySlug || place.difficulty),
    },
    {
      icon: 'car-outline',
      label: labels.access,
      value: getAccessTypeLabel(place.accessTypeSlug || place.accessType),
    },
    {
      icon: 'people-outline',
      label: labels.crowd,
      value: getCrowdLevelLabel(place.crowdLevelSlug || place.crowdLevel),
    },
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
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { settings } = useAppSettings();
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [adminDeleteVisible, setAdminDeleteVisible] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const { isSaved, isSaving, getSaveCount, pressSave } = useSavePlaceWithCollections();
  const {
    isLiked,
    getLikeCount,
    isToggling: isLikeToggling,
    toggleLike,
  } = usePlaceLikes();
  const { location } = useUserLocation();
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState(() =>
    t('explore.auth.save'),
  );
  const saved = place ? isSaved(place.id) : false;
  const liked = place ? isLiked(place.id) : false;
  const likeCount = place ? getLikeCount(place.id, place.likeCount) : 0;
  const saveCount = place ? getSaveCount(place.id, place.saveCount) : 0;
  const likeDisabled = place ? isLikeToggling(place.id) : false;
  const saveDisabled = place ? isSaving(place.id) : false;

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
          setCreatedBy(cachedDetail.createdBy);
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
          setCreatedBy(null);
          setNotFound(true);
        }
      } else {
        setPlace(placeDetail.place);
        setCreator(placeDetail.creator);
        setCreatedBy(placeDetail.createdBy);
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
    [place, location, settings.distanceUnit, i18n.language],
  );

  const openSimilarPlace = useCallback(
    (placeId: string) => {
      navigation.push(MAP_ROUTES.PLACE_DETAIL, { placeId });
    },
    [navigation],
  );

  const similarPlacesWithDistance = useMemo(
    () => withPlaceDistances(similarPlaces, location),
    [similarPlaces, location, settings.distanceUnit, i18n.language],
  );

  const galleryImages = displayPlace
    ? displayPlace.photos?.length
      ? displayPlace.photos
      : [displayPlace.image]
    : [];
  const displayTags = useMemo(
    () => (displayPlace ? buildDisplayTags(displayPlace) : []),
    [displayPlace, i18n.language],
  );
  const quickInfoItems = useMemo(
    () =>
      displayPlace
        ? buildQuickInfoItems(displayPlace, {
            distance: t('placeDetail.quickInfo.distance'),
            bestTime: t('placeDetail.quickInfo.bestTime'),
            difficulty: t('placeDetail.quickInfo.difficulty'),
            access: t('placeDetail.quickInfo.access'),
            crowd: t('placeDetail.quickInfo.crowd'),
          })
        : [],
    [displayPlace, t, i18n.language],
  );

  const stickyBottomPadding =
    tabBarInset.totalSpace + PLACE_DETAIL_STICKY_ACTIONS_HEIGHT + spacing.xxxl;

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
        message: t('placeDetail.share.message', {
          title: displayPlace.title,
          category: getPlacePrimaryCategoryLabel(displayPlace),
        }),
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
      showAppToast(t('map.directions.failed'), {
        tone: 'error',
      });
    }
  };

  const isOwner = useMemo(() => {
    if (!profile) {
      return false;
    }
    const ownerKeys = [profile.id, profile.auth_user_id, user?.id].filter(
      (value): value is string => Boolean(value),
    );
    if (createdBy && ownerKeys.includes(createdBy)) {
      return true;
    }
    if (creator?.id && ownerKeys.includes(creator.id)) {
      return true;
    }
    return false;
  }, [createdBy, creator?.id, profile, user?.id]);

  const openEditPlace = useCallback(() => {
    if (!displayPlace) {
      return;
    }
    navigation.navigate(MAP_ROUTES.EDIT_PLACE, { placeId: displayPlace.id });
  }, [displayPlace, navigation]);

  const handleSave = async () => {
    if (!displayPlace || saveDisabled) {
      return;
    }

    const result = await pressSave(displayPlace.id, {
      saveCount,
      onSaveCountChange: (nextCount) => {
        setPlace((prev) =>
          prev ? { ...prev, saveCount: Math.max(0, nextCount) } : prev,
        );
      },
    });

    if (result.requiresAuth) {
      setAuthPromptMessage(t('explore.auth.save'));
      setAuthPromptVisible(true);
    }
  };

  const handleLike = async () => {
    if (!displayPlace || likeDisabled) {
      return;
    }

    if (!requireAuth(user, 'like_place')) {
      setAuthPromptMessage(t('explore.auth.like'));
      setAuthPromptVisible(true);
      return;
    }

    try {
      const result = await toggleLike(displayPlace.id, likeCount);
      if (result.success && typeof result.likeCount === 'number') {
        setPlace((prev) =>
          prev ? { ...prev, likeCount: Math.max(0, result.likeCount ?? prev.likeCount) } : prev,
        );
      }
    } catch {
      // toggleLike already surfaces errors; keep UI stable
    }
  };

  const handleAdminDelete = async () => {
    if (!displayPlace || !isAdmin || adminDeleting) {
      return;
    }

    setAdminDeleting(true);
    const result = await softDeletePlace(displayPlace.id);
    setAdminDeleting(false);

    if (!result.success) {
      showAppToast(t('placeDetail.admin.toastError'), {
        tone: 'error',
      });
      return;
    }

    setAdminDeleteVisible(false);
    showAppToast(t('placeDetail.admin.toastSuccess'), {
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
          {isOffline ? t('placeDetail.offline.title') : t('placeDetail.notFound.title')}
        </Text>
        <Text style={[styles.notFoundText, { color: colors.textMuted }]}>
          {isOffline ? t('placeDetail.offline.body') : t('placeDetail.notFound.body')}
        </Text>
        <AppButton title={t('common.back')} onPress={() => navigation.goBack()} fullWidth={false} />
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
          <PlaceDetailHeroCarousel
            images={galleryImages}
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
            onImagePress={openViewer}
          />
        </ProfileEntranceBlock>

        <View style={styles.body}>
          <ProfileEntranceBlock index={1}>
            {/* Identity: chips → title → distance → owner */}
            <View style={styles.identitySection}>
              <View style={styles.titleRow}>
                <PlaceCategoryChips place={displayPlace} maxVisible={4} />
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
                  <Text style={[styles.verifiedText, { color: colors.primary }]}>{t('placeDetail.verified')}</Text>
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

              <View style={styles.ownerRow}>
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
            </View>

            {isOwner ? (
              <View style={styles.editSection}>
                <AppButton
                  title={t('placeDetail.edit')}
                  variant="secondary"
                  size="sm"
                  onPress={openEditPlace}
                  fullWidth={false}
                  style={styles.ownerEditButton}
                />
              </View>
            ) : null}

            <View style={isOwner ? styles.infoSectionAfterEdit : styles.infoSectionAfterOwner}>
              <PlaceQuickInfoCard items={quickInfoItems} />
            </View>

            <View style={styles.aboutSection}>
              <PlaceDescriptionBlock description={displayPlace.description} />
            </View>

            {displayPlace.safetyNote ? (
              <View style={styles.safetySection}>
                <PlaceSafetyBlock safetyNote={displayPlace.safetyNote} />
              </View>
            ) : null}

            {displayTags.length > 0 ? (
              <View style={styles.tagsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('placeDetail.tags')}</Text>
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
                  {t('placeDetail.admin.section')}
                </Text>
                <Pressable
                  onPress={() => setAdminDeleteVisible(true)}
                  disabled={adminDeleting}
                  accessibilityRole="button"
                  accessibilityLabel={t('placeDetail.admin.removeA11y')}
                  style={[
                    styles.adminDeleteButton,
                    { borderColor: colors.error, backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={[styles.adminDeleteText, { color: colors.error }]}>
                    {t('placeDetail.admin.remove')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ProfileEntranceBlock>

          {similarPlacesWithDistance.length > 0 ? (
            <ProfileEntranceBlock index={3}>
              <View style={styles.similarSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('placeDetail.similar')}
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
                      onRequiresAuth={() => {
                        setAuthPromptMessage(t('explore.auth.save'));
                        setAuthPromptVisible(true);
                      }}
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
          title={t('placeDetail.admin.confirmTitle')}
          subtitle={t('placeDetail.admin.confirmBody')}
          primaryLabel={adminDeleting ? t('placeDetail.admin.removing') : t('common.remove')}
          onPrimary={() => {
            void handleAdminDelete();
          }}
          secondaryLabel={t('common.cancel')}
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
  /**
   * Place Details vertical rhythm — section containers own spacing.
   * Tokens: md=12, lg=16, xl=20, xxl=24, xxxl=32
   */
  body: {
    paddingHorizontal: spacing.lg,
    /** Photo → chips */
    paddingTop: spacing.lg,
  },
  identitySection: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    /** Chips → title */
    marginTop: spacing.md,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    /** Title → distance */
    marginTop: spacing.lg,
  },
  distance: {
    ...typography.bodySmall,
  },
  ownerRow: {
    /** Distance → owner */
    marginTop: spacing.xl,
  },
  editSection: {
    /** Owner → edit and edit → info (equal) */
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  ownerEditButton: {
    alignSelf: 'flex-start',
  },
  infoSectionAfterEdit: {},
  infoSectionAfterOwner: {
    /** Owner → info cards when no edit button */
    marginTop: spacing.xxl,
  },
  aboutSection: {
    /** Info cards → About this place */
    marginTop: spacing.xxl,
  },
  safetySection: {
    marginTop: spacing.xl,
  },
  tagsSection: {
    /** Description → Tags */
    marginTop: spacing.xxl,
    /** Heading → tag chips */
    gap: spacing.md,
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
    marginTop: spacing.xl,
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
    /** Tags → Nearby similar places */
    marginTop: spacing.xxxl,
    /** Heading → similar cards */
    gap: spacing.md,
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

