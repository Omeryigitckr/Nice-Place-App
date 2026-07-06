import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  AuthRequiredModal,
  EmptyState,
  PlaceListCard,
  PlaceListSkeleton,
  SectionHeader,
} from '../components';
import { readSavedPlacesCache } from '../cache';
import { MAP_ROUTES, TAB_ROUTES } from '../constants';
import { showAppToast } from '../feedback';
import {
  useAppSettings,
  useAuth,
  useFloatingTabBarInset,
  useNetworkStatus,
  usePlaceLikes,
  useSavedPlaces,
  useUserLocation,
} from '../hooks';
import { getSavedPlaces } from '../services';
import { spacing } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { Place } from '../types/place';
import { MainTabParamList } from '../types';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { withPlaceDistances } from '../utils';

type Props = BottomTabScreenProps<MainTabParamList, typeof TAB_ROUTES.SAVED>;

const STALE_MS = 45_000;
const keyExtractor = (item: Place) => item.id;
const ItemSeparator = () => <View style={styles.separator} />;

export function SavedPlacesScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarInset = useFloatingTabBarInset();
  const { user, profile, loading: authLoading } = useAuth();
  const { settings } = useAppSettings();
  const { location } = useUserLocation();
  const { ready, syncIds } = useSavedPlaces();
  const { isLiked, getLikeCount, isToggling, toggleLike } = usePlaceLikes();
  const { isOffline } = useNetworkStatus();
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const lastFetchAtRef = useRef(0);
  const hasDataRef = useRef(false);
  const savedPlacesRef = useRef(savedPlaces);
  savedPlacesRef.current = savedPlaces;

  const displayPlaces = useMemo(
    () => withPlaceDistances(savedPlaces, location),
    [savedPlaces, location, settings.distanceUnit],
  );

  const listData = useMemo(
    () => (user && !loading && ready ? displayPlaces : []),
    [user, loading, ready, displayPlaces],
  );

  const contentContainerStyle = useMemo(
    () => [
      styles.content,
      {
        paddingTop: insets.top + spacing.sm,
        paddingBottom: tabBarInset.contentPaddingBottom,
      },
    ],
    [insets.top, tabBarInset.contentPaddingBottom],
  );

  // Drop private saved list immediately when session becomes guest.
  useEffect(() => {
    if (!profile?.id) {
      setSavedPlaces([]);
      hasDataRef.current = false;
      lastFetchAtRef.current = 0;
      setLoading(false);
    }
  }, [profile?.id]);

  const loadSaved = useCallback(async (options?: { silent?: boolean }) => {
    if (!profile?.id) {
      setSavedPlaces([]);
      hasDataRef.current = false;
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      const cached = await readSavedPlacesCache(profile.id, { allowExpired: true });
      if (cached?.length) {
        hasDataRef.current = true;
        setSavedPlaces(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    try {
      const places = await getSavedPlaces(profile.id);
      lastFetchAtRef.current = Date.now();
      hasDataRef.current = places.length > 0;
      setSavedPlaces(places);
      // Sync engagement ids from the list — avoids a second saved_places ids query.
      syncIds(places.map((place) => place.id));
    } catch {
      // Keep any cached list already shown.
    } finally {
      setLoading(false);
    }
  }, [profile?.id, syncIds]);

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchAtRef.current < STALE_MS && hasDataRef.current) {
        return;
      }
      void loadSaved();
    }, [loadSaved]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSaved({ silent: true });
    setRefreshing(false);
    showAppToast('Saved places updated', { tone: 'success', durationMs: 1400 });
  }, [loadSaved]);

  const openOnMap = useCallback(
    (placeId: string) => {
      navigation.navigate(TAB_ROUTES.EXPLORE, {
        screen: MAP_ROUTES.PLACE_DETAIL,
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
        }
      });
    },
    [isToggling, toggleLike, user],
  );

  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item }) => (
      <PlaceListCard
        place={item}
        saved
        liked={isLiked(item.id)}
        likeCount={getLikeCount(item.id, item.likeCount)}
        likeDisabled={isToggling(item.id)}
        onLikeId={handleLikeId}
        onPressId={openOnMap}
        actionLabel="View on map"
        onActionId={openOnMap}
      />
    ),
    [getLikeCount, handleLikeId, isLiked, isToggling, openOnMap],
  );

  const listHeader = useMemo(
    () => (
      <SectionHeader
        title="Your collection"
        subtitle="Places you want to visit later, all in one list."
        count={user && !loading ? displayPlaces.length : undefined}
      />
    ),
    [user, loading, displayPlaces.length],
  );

  const listEmpty = useMemo(() => {
    if (authLoading || !ready || (user && loading)) {
      return <PlaceListSkeleton count={4} />;
    }
    if (!user) {
      return (
        <EmptyState
          icon="person-outline"
          title="Sign in to save places"
          description="Create an account to bookmark places and find them here later."
          action={
            <AppButton
              title="Sign in"
              onPress={() => navigateToAuth(navigation)}
              fullWidth={false}
            />
          }
        />
      );
    }
    return (
      <EmptyState
        icon={isOffline ? 'cloud-offline-outline' : 'bookmark-outline'}
        title={isOffline ? 'No cached saved places' : 'No saved places'}
        description={
          isOffline
            ? 'Connect to the internet to load your saved places.'
            : 'Save places from the map to find them here later.'
        }
      />
    );
  }, [authLoading, ready, user, loading, isOffline, navigation]);

  const refreshControl = useMemo(
    () =>
      user ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void handleRefresh();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      ) : undefined,
    [user, refreshing, handleRefresh, colors.primary],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={contentContainerStyle}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        extraData={`${likedKey(isLiked, listData)}:${togglingKey(isToggling, listData)}`}
      />

      <AuthRequiredModal
        visible={authPromptVisible}
        message="Sign in to like places."
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />
    </View>
  );
}

function likedKey(isLiked: (id: string) => boolean, places: Place[]): string {
  return places
    .filter((place) => isLiked(place.id))
    .map((place) => place.id)
    .join(',');
}

function togglingKey(isToggling: (id: string) => boolean, places: Place[]): string {
  return places
    .filter((place) => isToggling(place.id))
    .map((place) => place.id)
    .join(',');
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
    gap: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
});
