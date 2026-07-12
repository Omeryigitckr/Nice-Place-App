import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppButton,
  AuthRequiredModal,
  EmptyState,
  PlaceCardCollectionActions,
  PlaceListCard,
  PlaceListSkeleton,
  SectionHeader,
} from '../components';
import { readSavedPlacesCache } from '../cache';
import { MAP_ROUTES, SAVED_ROUTES, TAB_ROUTES } from '../constants';
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
import { useSavePlaceWithCollections } from '../providers/SavePlaceWithCollectionsProvider';
import { getSavedPlaces } from '../services';
import { spacing } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { Place } from '../types/place';
import { SavedStackParamList } from '../types';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { withPlaceDistances } from '../utils';

type Props = NativeStackScreenProps<SavedStackParamList, typeof SAVED_ROUTES.ALL_SAVED_PLACES>;

const STALE_MS = 45_000;
const keyExtractor = (item: Place) => item.id;
const ItemSeparator = () => <View style={styles.separator} />;

export function AllSavedPlacesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tabBarInset = useFloatingTabBarInset();
  const { user, profile, loading: authLoading } = useAuth();
  const { settings } = useAppSettings();
  const { location } = useUserLocation();
  const { ready, syncIds } = useSavedPlaces();
  const { isSaving, pressSave } = useSavePlaceWithCollections();
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
      syncIds(places.map((place) => place.id));
    } catch {
      // Keep cached list.
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
    showAppToast(t('saved.all.toastRefreshed'), { tone: 'success', durationMs: 1400 });
  }, [loadSaved, t]);

  const openOnMap = useCallback(
    (placeId: string) => {
      navigation.getParent()?.navigate(TAB_ROUTES.EXPLORE, {
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
      void toggleLike(placeId, place?.likeCount ?? 0)
        .then((result) => {
          if (result.success && typeof result.likeCount === 'number') {
            setSavedPlaces((prev) =>
              prev.map((item) =>
                item.id === placeId ? { ...item, likeCount: Math.max(0, result.likeCount!) } : item,
              ),
            );
          }
        })
        .catch(() => undefined);
    },
    [isToggling, toggleLike, user],
  );

  const handleUnsaveId = useCallback(
    (placeId: string) => {
      if (isSaving(placeId)) {
        return;
      }
      if (!requireAuth(user, 'save_place')) {
        setAuthPromptVisible(true);
        return;
      }
      const place = savedPlacesRef.current.find((item) => item.id === placeId);
      void pressSave(placeId, { saveCount: place?.saveCount ?? 0 }).then((result) => {
        if (result.success) {
          setSavedPlaces((prev) => prev.filter((item) => item.id !== placeId));
        } else if (result.requiresAuth) {
          setAuthPromptVisible(true);
        }
      });
    },
    [isSaving, pressSave, user],
  );

  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item }) => (
      <View style={styles.cardWrap}>
        <PlaceListCard
          place={item}
          saved
          liked={isLiked(item.id)}
          likeCount={getLikeCount(item.id, item.likeCount)}
          likeDisabled={isToggling(item.id)}
          onLikeId={handleLikeId}
          onPressId={openOnMap}
          actionLabel={t('saved.viewOnMap')}
          onActionId={openOnMap}
        />
        <PlaceCardCollectionActions
          placeId={item.id}
          saveCount={item.saveCount}
          onRequiresAuth={() => setAuthPromptVisible(true)}
          onUnsave={() => handleUnsaveId(item.id)}
          unsaveLoading={isSaving(item.id)}
        />
      </View>
    ),
    [getLikeCount, handleLikeId, handleUnsaveId, isLiked, isSaving, isToggling, openOnMap, t],
  );

  const listHeader = useMemo(
    () => (
      <SectionHeader
        title={t('saved.all.title')}
        subtitle={t('saved.all.subtitle')}
        count={user && !loading ? displayPlaces.length : undefined}
      />
    ),
    [displayPlaces.length, loading, t, user],
  );

  const listEmpty = useMemo(() => {
    if (authLoading || !ready || (user && loading)) {
      return <PlaceListSkeleton count={4} />;
    }
    if (!user) {
      return (
        <EmptyState
          icon="person-outline"
          title={t('saved.empty.guestTitle')}
          description={t('saved.empty.guestBodyList')}
          action={
            <AppButton
              title={t('common.signIn')}
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
        title={isOffline ? t('saved.empty.noCachedTitle') : t('saved.empty.noSavedTitle')}
        description={
          isOffline ? t('saved.empty.noCachedBody') : t('saved.empty.noSavedBody')
        }
      />
    );
  }, [authLoading, ready, user, loading, isOffline, navigation, t]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarInset.contentPaddingBottom + spacing.lg },
        ]}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          user ? (
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
        showsVerticalScrollIndicator={false}
        extraData={`${likedKey(isLiked, listData)}:${togglingKey(isToggling, listData)}`}
      />

      <AuthRequiredModal
        visible={authPromptVisible}
        message={t('saved.auth.manage')}
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
  return places.filter((place) => isLiked(place.id)).map((place) => place.id).join(',');
}

function togglingKey(isToggling: (id: string) => boolean, places: Place[]): string {
  return places.filter((place) => isToggling(place.id)).map((place) => place.id).join(',');
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
    gap: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
  cardWrap: {
    gap: spacing.sm,
  },
});
