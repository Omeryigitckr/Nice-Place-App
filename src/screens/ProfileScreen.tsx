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
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { PlaceStatus } from '../types/database';
import { OwnedPlace, Place } from '../types/place';
import { MainTabParamList, ProfileStackParamList } from '../types';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { withPlaceDistances } from '../utils/distance';

type Props = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.PROFILE_HOME>,
  BottomTabScreenProps<MainTabParamList>
>;

type ProfileTab = 'shared' | 'saved';
type SharedStatusFilter = Extract<PlaceStatus, 'approved' | 'pending' | 'rejected'>;
type StatIcon = keyof typeof Ionicons.glyphMap;

const SHARED_STATUS_FILTERS: { key: SharedStatusFilter; label: string }[] = [
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'shared', label: 'Shared' },
  { key: 'saved', label: 'Saved' },
];

const GUEST_STATS: { label: string; value: string; icon: StatIcon }[] = [
  { label: 'Shared', value: '—', icon: 'add-circle-outline' },
  { label: 'Saved', value: '—', icon: 'bookmark-outline' },
  { label: 'Likes', value: '—', icon: 'heart-outline' },
];

function buildUserStats(stats: ProfileStats): { label: string; value: string; icon: StatIcon }[] {
  return [
    { label: 'Shared', value: `${stats.sharedPlacesCount}`, icon: 'add-circle-outline' },
    { label: 'Saved', value: `${stats.savedPlacesCount}`, icon: 'bookmark-outline' },
    { label: 'Likes', value: `${stats.likesReceived}`, icon: 'heart-outline' },
  ];
}

export function ProfileScreen({ navigation }: Props) {
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
    showAppToast('Profile updated', { tone: 'success', durationMs: 1400 });
  }, [loadProfileData, refresh]);

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

      void toggleLike(placeId, fallbackCount).then((result) => {
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
      });
    },
    [isToggling, toggleLike, user],
  );

  const isGuest = !user;
  const { showAdminEntry, loading: adminLoading } = useAdminAccess();
  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'Guest Explorer';
  const username = profile?.username?.trim();
  const bio = isGuest
    ? 'Sign in to save places, share discoveries, and build your explorer profile.'
    : profile?.bio?.trim() || 'Finding quiet places and sunset views.';
  const statItems = isGuest ? GUEST_STATS : buildUserStats(stats);
  const hasPendingPlaces = sharedPlaces.some((place) => place.status === 'pending');
  const filteredSharedPlaces = useMemo(
    () => sharedPlaces.filter((place) => place.status === sharedStatusFilter),
    [sharedPlaces, sharedStatusFilter],
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
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Profile</Text>
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
            accessibilityLabel="Open settings"
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
                showToast('Profile photo updated.');
                devLog('[Nice Place Profile] profile avatar update success:', avatarUrl);
              }}
              onError={(message) => {
                showToast(message);
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
            <View key={stat.label} style={styles.statItem}>
              {contentLoading && !isGuest ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.statSpinner} />
              ) : (
                <AnimatedStatValue value={stat.value} color={colors.primary} />
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={3}>
        {!isGuest ? (
          <View style={styles.actionRow}>
            <AppButton title="Share a place" onPress={openAddPlace} fullWidth={false} />
            <AppButton
              title="Edit profile"
              variant="secondary"
              onPress={() => navigation.navigate(PROFILE_ROUTES.SETTINGS_ACCOUNT)}
              fullWidth={false}
            />
          </View>
        ) : (
          <AppButton
            title="Sign in"
            onPress={() => navigateToAuth(navigation)}
            fullWidth={false}
          />
        )}

        {showAdminEntry ? (
          <AppButton
            title="Admin Panel"
            variant="secondary"
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
            Checking admin access…
          </Text>
        ) : null}
      </ProfileEntranceBlock>

      {!isGuest ? (
        <ProfileEntranceBlock index={4}>
          <ProfileTabs tabs={PROFILE_TABS} activeKey={activeTab} onChange={setActiveTab} />

          {activeTab === 'shared' ? (
            <View style={styles.statusFilters}>
              {SHARED_STATUS_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  active={sharedStatusFilter === filter.key}
                  onPress={() => setSharedStatusFilter(filter.key)}
                />
              ))}
            </View>
          ) : null}

          {activeTab === 'shared' && hasPendingPlaces && sharedStatusFilter === 'pending' ? (
            <Text style={[styles.pendingNote, { color: colors.warning }]}>
              Pending places are visible only to you until approved.
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
                        ? 'No cached shared places'
                        : sharedStatusFilter === 'approved'
                          ? 'No approved places'
                          : sharedStatusFilter === 'pending'
                            ? 'No pending places'
                            : 'No rejected places'
                    }
                    description={
                      isOffline
                        ? 'Connect to the internet to load your shared places.'
                        : sharedStatusFilter === 'approved'
                          ? 'Share a quiet spot or sunset view with the community.'
                          : sharedStatusFilter === 'pending'
                            ? 'Places waiting for review will show up here.'
                            : 'Rejected submissions will show up here.'
                    }
                    action={
                      isOffline || sharedStatusFilter !== 'approved' ? undefined : (
                        <AppButton title="Share a place" onPress={openAddPlace} fullWidth={false} />
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
                  title={isOffline ? 'No cached saved places' : 'No saved places'}
                  description={
                    isOffline
                      ? 'Connect to the internet to load your saved places.'
                      : 'Save places from Explore to build your collection.'
                  }
                  action={
                    isOffline ? undefined : (
                      <AppButton
                        title="Explore map"
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
        message="Sign in to like places."
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
    width: 40,
    height: 40,
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
