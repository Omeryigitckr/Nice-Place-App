import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CompositeScreenProps } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { devLog } from '../utils/devLog';

import {
  AnimatedStatValue,
  AppButton,
  AuthRequiredModal,
  EmptyState,
  FilterChip,
  PlaceGridSkeleton,
  PlaceListCard,
  PlaceListSkeleton,
  ProfileAvatar,
  ProfileEntranceBlock,
  ProfileGridItem,
  ProfileHeaderSkeleton,
  ProfileTabPanel,
  ProfileTabs,
  ScreenContainer,
  SharedPlaceCard,
  ToastBanner,
} from '../components';
import { readMyPlacesCache, readSavedPlacesCache } from '../cache';
import { showAppToast } from '../feedback';
import { MAP_ROUTES, PROFILE_ROUTES, TAB_ROUTES } from '../constants';
import {
  useAdminAccess,
  useAuth,
  useNetworkStatus,
  usePlaceLikes,
  useProfileStats,
  useUserLocation,
} from '../hooks';
import { getLikesReceivedForProfile } from '../services/likesService';
import { getMyPlaces, getSavedPlaces, ProfileStats } from '../services';
import { radius, spacing, touchTarget, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { PlaceStatus } from '../types/database';
import { OwnedPlace, Place } from '../types/place';
import { MainTabParamList, ProfileStackParamList } from '../types';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { withPlaceDistances } from '../utils/distance';
import { localizeProfileMessage } from '../utils/profileMessages';

type Props = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.PROFILE_HOME>,
  BottomTabScreenProps<MainTabParamList>
>;

type ProfileTab = 'shared' | 'saved';
type SharedStatusFilter = Extract<PlaceStatus, 'approved' | 'pending' | 'rejected'>;
type StatKey = 'shared' | 'saved' | 'likes';
type StatIcon = keyof typeof Ionicons.glyphMap;

const SHARED_STATUS_FILTERS: {
  key: SharedStatusFilter;
  labelKey:
    | 'profile.filters.approved'
    | 'profile.filters.pending'
    | 'profile.filters.rejected';
}[] = [
  { key: 'approved', labelKey: 'profile.filters.approved' },
  { key: 'pending', labelKey: 'profile.filters.pending' },
  { key: 'rejected', labelKey: 'profile.filters.rejected' },
];

const PROFILE_TABS: {
  key: ProfileTab;
  labelKey: 'profile.tabs.shared' | 'profile.tabs.saved';
}[] = [
  { key: 'shared', labelKey: 'profile.tabs.shared' },
  { key: 'saved', labelKey: 'profile.tabs.saved' },
];

const STAT_LABEL_KEYS: Record<
  StatKey,
  'profile.stats.shared' | 'profile.stats.saved' | 'profile.stats.likes'
> = {
  shared: 'profile.stats.shared',
  saved: 'profile.stats.saved',
  likes: 'profile.stats.likes',
};

const GUEST_STATS: { key: StatKey; value: string; icon: StatIcon }[] = [
  { key: 'shared', value: '—', icon: 'add-circle-outline' },
  { key: 'saved', value: '—', icon: 'bookmark-outline' },
  { key: 'likes', value: '—', icon: 'heart-outline' },
];

function buildUserStats(stats: ProfileStats): { key: StatKey; value: string; icon: StatIcon }[] {
  return [
    { key: 'shared', value: `${stats.sharedPlacesCount}`, icon: 'add-circle-outline' },
    { key: 'saved', value: `${stats.savedPlacesCount}`, icon: 'bookmark-outline' },
    { key: 'likes', value: `${stats.likesReceived}`, icon: 'heart-outline' },
  ];
}

export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { user, profile, loading, refresh } = useAuth();
  const { location } = useUserLocation();
  const { stats, applyStats } = useProfileStats(profile?.id);
  const { isLiked, getLikeCount, isToggling, toggleLike } = usePlaceLikes();
  const { isOffline } = useNetworkStatus();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [sharedPlaces, setSharedPlaces] = useState<OwnedPlace[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('shared');
  const [sharedStatusFilter, setSharedStatusFilter] =
    useState<SharedStatusFilter>('approved');
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchAtRef = useRef(0);
  const hasDataRef = useRef(false);
  const PROFILE_STALE_MS = 45_000;

  // Drop private lists immediately when session becomes guest.
  useEffect(() => {
    if (!profile?.id) {
      setSharedPlaces([]);
      setSavedPlaces([]);
      hasDataRef.current = false;
      lastFetchAtRef.current = 0;
    }
  }, [profile?.id]);

  const loadProfileData = useCallback(async (options?: { silent?: boolean }) => {
    if (!profile?.id) {
      setSharedPlaces([]);
      setSavedPlaces([]);
      hasDataRef.current = false;
      return;
    }

    if (!options?.silent) {
      const [cachedMine, cachedSaved] = await Promise.all([
        readMyPlacesCache(profile.id, { allowExpired: true }),
        readSavedPlacesCache(profile.id, { allowExpired: true }),
      ]);
      if (cachedMine?.length || cachedSaved?.length) {
        hasDataRef.current = true;
        if (cachedMine) {
          setSharedPlaces(withPlaceDistances(cachedMine, location) as OwnedPlace[]);
        }
        if (cachedSaved) {
          setSavedPlaces(withPlaceDistances(cachedSaved, location));
        }
        setContentLoading(false);
      } else {
        setContentLoading(true);
      }
    }

    try {
      const [myPlaces, saved, likesReceived] = await Promise.all([
        getMyPlaces(profile.id),
        getSavedPlaces(profile.id),
        getLikesReceivedForProfile(profile.id),
      ]);

      lastFetchAtRef.current = Date.now();
      hasDataRef.current = myPlaces.length > 0 || saved.length > 0;
      setSharedPlaces(withPlaceDistances(myPlaces, location) as OwnedPlace[]);
      setSavedPlaces(withPlaceDistances(saved, location));
      // Derive list counts from fetched data — skips duplicate head-count queries.
      applyStats({
        sharedPlacesCount: myPlaces.filter((place) => place.status === 'approved').length,
        savedPlacesCount: saved.length,
        likesReceived,
      });
    } catch {
      // Keep any cached lists already shown.
    } finally {
      setContentLoading(false);
    }
  }, [profile?.id, location, applyStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await loadProfileData({ silent: true });
    setRefreshing(false);
    showAppToast(t('profile.toasts.refreshed'), { tone: 'success', durationMs: 1400 });
  }, [loadProfileData, refresh, t]);

  useFocusEffect(
    useCallback(() => {
      if (!profile?.id) {
        return;
      }
      if (Date.now() - lastFetchAtRef.current < PROFILE_STALE_MS && hasDataRef.current) {
        return;
      }
      void loadProfileData();
    }, [profile?.id, loadProfileData]),
  );

  const savedPlacesRef = useRef(savedPlaces);
  savedPlacesRef.current = savedPlaces;

  const openPlaceDetail = useCallback(
    (placeId: string) => {
      navigation.navigate(TAB_ROUTES.EXPLORE, {
        screen: MAP_ROUTES.PLACE_DETAIL,
        params: { placeId },
      });
    },
    [navigation],
  );

  const openEditPlaceId = useCallback(
    (placeId: string) => {
      navigation.navigate(TAB_ROUTES.EXPLORE, {
        screen: MAP_ROUTES.EDIT_PLACE,
        params: { placeId },
      });
    },
    [navigation],
  );

  const handleLikeId = useCallback(
    (placeId: string) => {
      if (isToggling(placeId)) {
        return;
      }

      if (!requireAuth(user, 'like_place')) {
        setAuthPromptVisible(true);
        return;
      }

      const place = savedPlacesRef.current.find((item) => item.id === placeId);
      const fallbackCount = place?.likeCount ?? 0;

      void toggleLike(placeId, fallbackCount)
        .then((result) => {
          if (result.success && typeof result.likeCount === 'number') {
            const nextCount = Math.max(0, result.likeCount);
            setSavedPlaces((prev) =>
              prev.map((item) =>
                item.id === placeId ? { ...item, likeCount: nextCount } : item,
              ),
            );
            setSharedPlaces((prev) =>
              prev.map((item) =>
                item.id === placeId ? { ...item, likeCount: nextCount } : item,
              ),
            );
          }
        })
        .catch(() => undefined);
    },
    [isToggling, toggleLike, user],
  );

  const isGuest = !user;
  const { showAdminEntry, loading: adminLoading } = useAdminAccess();
  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    user?.email?.split('@')[0] ||
    t('profile.guestName');
  const username = profile?.username?.trim();
  const bio = isGuest
    ? t('profile.guestBio')
    : profile?.bio?.trim() || t('profile.defaultBio');
  const statItems = isGuest ? GUEST_STATS : buildUserStats(stats);
  const hasPendingPlaces = sharedPlaces.some((place) => place.status === 'pending');
  const filteredSharedPlaces = useMemo(
    () => sharedPlaces.filter((place) => place.status === sharedStatusFilter),
    [sharedPlaces, sharedStatusFilter],
  );
  const profileTabs = useMemo(
    () => PROFILE_TABS.map((tab) => ({ key: tab.key, label: t(tab.labelKey) })),
    [t],
  );

  const openAddPlace = useCallback(() => {
    navigation.navigate(TAB_ROUTES.ADD_PLACE);
  }, [navigation]);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  return (
    <ScreenContainer
      scrollable
      safeTop={false}
      reserveFloatingTabBar
      contentStyle={styles.content}
      refreshControl={
        !isGuest ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      <View style={{ height: insets.top + spacing.sm }} />
      {toastMessage ? (
        <ToastBanner
          message={toastMessage}
          visible={toastMessage != null}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}

      <ProfileEntranceBlock index={0}>
        <View style={styles.topBar}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            {t('profile.title')}
          </Text>
          <Pressable
            style={[
              styles.settingsButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...shadows.sm,
              },
            ]}
            onPress={() => navigation.navigate(PROFILE_ROUTES.SETTINGS)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.a11y.openSettings')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={1} style={styles.profileHeader}>
        {loading && !isGuest ? (
          <ProfileHeaderSkeleton />
        ) : (
          <>
            <ProfileAvatar
              displayName={displayName}
              avatarUrl={profile?.avatar_url}
              profileId={profile?.id}
              authUserId={user?.id}
              previousStoragePath={profile?.avatar_storage_path}
              size={104}
              editable={!isGuest}
              onAvatarUpdated={async (avatarUrl) => {
                await refresh();
                showToast(t('profile.toasts.photoUpdated'));
                devLog('[Nice Place Profile] profile avatar update success:', avatarUrl);
              }}
              onError={(message) => {
                showToast(localizeProfileMessage(message) ?? message);
              }}
            />

            <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
            {username ? (
              <Text style={[styles.username, { color: colors.primary }]}>@{username}</Text>
            ) : null}
            <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={3}>
              {bio}
            </Text>
          </>
        )}
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={2}>
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.sm,
            },
          ]}
        >
          {statItems.map((stat) => (
            <View key={stat.key} style={styles.statItem}>
              {contentLoading && !isGuest ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.statSpinner} />
              ) : (
                <AnimatedStatValue value={stat.value} color={colors.primary} />
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t(STAT_LABEL_KEYS[stat.key])}
              </Text>
            </View>
          ))}
        </View>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={3}>
        {!isGuest ? (
          <View style={styles.actionRow}>
            <AppButton
              title={t('addPlace.title')}
              onPress={openAddPlace}
              fullWidth={false}
            />
            <AppButton
              title={t('profile.actions.editProfile')}
              variant="secondary"
              onPress={() => navigation.navigate(PROFILE_ROUTES.SETTINGS_ACCOUNT)}
              fullWidth={false}
            />
          </View>
        ) : (
          <AppButton
            title={t('common.signIn')}
            onPress={() => navigateToAuth(navigation)}
            fullWidth={false}
          />
        )}

        {showAdminEntry ? (
          <AppButton
            title={t('navigation.adminPanel')}
            variant="secondary"
            style={styles.adminPanelButton}
            onPress={() => {
              devLog('[Nice Place Admin] entry pressed', {
                where: 'ProfileScreen',
                route: PROFILE_ROUTES.ADMIN_PANEL,
              });
              if (!requireAuth(user, 'admin_panel')) {
                navigateToAuth(navigation);
                return;
              }
              navigation.navigate(PROFILE_ROUTES.ADMIN_PANEL);
            }}
          />
        ) : adminLoading && user ? (
          <Text style={[styles.adminLoading, { color: colors.textMuted }]}>
            {t('profile.checkingAdmin')}
          </Text>
        ) : null}
      </ProfileEntranceBlock>

      {!isGuest ? (
        <ProfileEntranceBlock index={4}>
          <ProfileTabs tabs={profileTabs} activeKey={activeTab} onChange={setActiveTab} />

          {activeTab === 'shared' ? (
            <View style={styles.statusFilters}>
              {SHARED_STATUS_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={t(filter.labelKey)}
                  active={sharedStatusFilter === filter.key}
                  onPress={() => setSharedStatusFilter(filter.key)}
                />
              ))}
            </View>
          ) : null}

          {activeTab === 'shared' && hasPendingPlaces && sharedStatusFilter === 'pending' ? (
            <Text style={[styles.pendingNote, { color: colors.warning }]}>
              {t('profile.pendingNote')}
            </Text>
          ) : null}

          {contentLoading ? (
            activeTab === 'shared' ? (
              <PlaceGridSkeleton />
            ) : (
              <PlaceListSkeleton count={4} />
            )
          ) : (
            <ProfileTabPanel tabKey={activeTab}>
              {activeTab === 'shared' ? (
                filteredSharedPlaces.length === 0 ? (
                  <EmptyState
                    icon={isOffline ? 'cloud-offline-outline' : 'map-outline'}
                    title={
                      isOffline
                        ? t('profile.empty.sharedOfflineTitle')
                        : sharedStatusFilter === 'approved'
                          ? t('profile.empty.noApprovedTitle')
                          : sharedStatusFilter === 'pending'
                            ? t('profile.empty.noPendingTitle')
                            : t('profile.empty.noRejectedTitle')
                    }
                    description={
                      isOffline
                        ? t('profile.empty.sharedOfflineBody')
                        : sharedStatusFilter === 'approved'
                          ? t('profile.empty.noApprovedBody')
                          : sharedStatusFilter === 'pending'
                            ? t('profile.empty.noPendingBody')
                            : t('profile.empty.noRejectedBody')
                    }
                    action={
                      isOffline || sharedStatusFilter !== 'approved' ? undefined : (
                        <AppButton
                          title={t('addPlace.title')}
                          onPress={openAddPlace}
                          fullWidth={false}
                        />
                      )
                    }
                  />
                ) : (
                  <View style={styles.grid}>
                    {filteredSharedPlaces.map((place, index) => (
                      <ProfileGridItem key={place.id} index={index} style={styles.gridItem}>
                        <SharedPlaceCard
                          place={place}
                          onPressId={
                            place.status === 'approved' ? openPlaceDetail : undefined
                          }
                          onEditId={
                            place.status === 'approved' || place.status === 'rejected'
                              ? openEditPlaceId
                              : undefined
                          }
                        />
                      </ProfileGridItem>
                    ))}
                  </View>
                )
              ) : savedPlaces.length === 0 ? (
                <EmptyState
                  icon={isOffline ? 'cloud-offline-outline' : 'bookmark-outline'}
                  title={
                    isOffline
                      ? t('saved.empty.noCachedTitle')
                      : t('saved.empty.noSavedTitle')
                  }
                  description={
                    isOffline
                      ? t('saved.empty.noCachedBody')
                      : t('profile.empty.savedExploreBody')
                  }
                  action={
                    isOffline ? undefined : (
                      <AppButton
                        title={t('profile.actions.exploreMap')}
                        onPress={() => navigation.navigate(TAB_ROUTES.EXPLORE)}
                        fullWidth={false}
                      />
                    )
                  }
                />
              ) : (
                <View style={styles.list}>
                  {savedPlaces.map((place, index) => (
                    <ProfileGridItem key={place.id} index={index}>
                      <PlaceListCard
                        place={place}
                        compact
                        saved
                        liked={isLiked(place.id)}
                        likeCount={getLikeCount(place.id, place.likeCount)}
                        likeDisabled={isToggling(place.id)}
                        onLikeId={handleLikeId}
                        onPressId={openPlaceDetail}
                      />
                    </ProfileGridItem>
                  ))}
                </View>
              )}
            </ProfileTabPanel>
          )}
        </ProfileEntranceBlock>
      ) : null}

      <AuthRequiredModal
        visible={authPromptVisible}
        message={t('explore.auth.like')}
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    ...typography.subtitle,
    fontSize: 18,
  },
  settingsButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  name: {
    ...typography.subtitle,
    fontSize: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  username: {
    ...typography.bodySmall,
  },
  bio: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  statSpinner: {
    marginVertical: 2,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  adminPanelButton: {
    marginTop: spacing.md,
  },
  adminLoading: {
    ...typography.caption,
    textAlign: 'center',
    width: '100%',
    marginTop: spacing.xs,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pendingNote: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLoader: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  gridItem: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '50%',
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
