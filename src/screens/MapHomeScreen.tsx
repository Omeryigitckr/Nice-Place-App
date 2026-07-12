import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { ensureLocationPermission, openAppSettings } from '../services/appPermissionsService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  ExploreFiltersPanel,
  ExploreSearchBar,
  ExploreSearchResults,
  MapFabButton,
  MapInlineNotice,
  NotificationBellButton,
  PermissionBlockedModal,
  PlaceMapView,
  PlaceMapViewHandle,
  PlacePreviewCard,
  PLACE_PREVIEW_CARD_HEIGHT,
  SortChip,
  ToastBanner,
} from '../components';
import { AuthRequiredModal } from '../components/AuthRequiredModal';
import { readMapPlacesCache } from '../cache';
import { MAP_ROUTES } from '../constants';
import { subscribeNetworkStatus, getNetworkStatus } from '../network';
import {
  useAppSettings,
  useAuth,
  useFloatingTabBarInset,
  usePlaceLikes,
} from '../hooks';
import { useNotifications } from '../hooks/useNotifications';
import { useSavePlaceWithCollections } from '../providers/SavePlaceWithCollectionsProvider';
import {
  addRecentSearch,
  loadPlacesForMap,
  loadRecentSearches,
  removeRecentSearch,
} from '../services';
import { mapMotion, spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { QuickFilter, Place } from '../types/place';
import { MapStackParamList } from '../types';
import {
  countActiveExploreFilters,
  EMPTY_EXPLORE_FILTERS,
  estimateCameraDurationMs,
  ExploreFilters,
  filterPlaces,
  openExternalDirections,
  sortPlaces,
  withPlaceDistances,
} from '../utils';
import type { MapCameraFlyOptions, MapCameraTarget } from '../utils';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { computePlacesCenter, getMapboxConfigError } from '../utils/mapbox';

type Props = NativeStackScreenProps<MapStackParamList, typeof MAP_ROUTES.MAP_HOME>;

const QUICK_FILTERS: {
  key: QuickFilter;
  labelKey:
    | 'explore.quickFilters.nearby'
    | 'explore.quickFilters.hiddenGems'
    | 'explore.quickFilters.sunset'
    | 'explore.quickFilters.camping';
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'nearby', labelKey: 'explore.quickFilters.nearby', icon: 'navigate-outline' },
  { key: 'hidden_gems', labelKey: 'explore.quickFilters.hiddenGems', icon: 'diamond-outline' },
  { key: 'sunset', labelKey: 'explore.quickFilters.sunset', icon: 'partly-sunny-outline' },
  { key: 'camping', labelKey: 'explore.quickFilters.camping', icon: 'bonfire-outline' },
];

const LOCATION_EPSILON = 0.00015;

interface UserLocationCoords {
  longitude: number;
  latitude: number;
}

function locationsDiffer(a: UserLocationCoords, b: UserLocationCoords): boolean {
  return (
    Math.abs(a.longitude - b.longitude) > LOCATION_EPSILON ||
    Math.abs(a.latitude - b.latitude) > LOCATION_EPSILON
  );
}

export function MapHomeScreen({ navigation: _navigation }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList>>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { settings } = useAppSettings();
  const tabBarInset = useFloatingTabBarInset();
  const mapRef = useRef<PlaceMapViewHandle>(null);
  const locateInFlightRef = useRef(false);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const mapInitialCenterRef = useRef<[number, number] | null>(null);
  const cameraGenerationRef = useRef(0);
  const lastCameraCenterRef = useRef<MapCameraTarget | null>(null);

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const topOverlayOpacity = useRef(new Animated.Value(0)).current;
  const topOverlayTranslateY = useRef(new Animated.Value(10)).current;
  const mapContentOpacity = useRef(new Animated.Value(0)).current;
  const fabOpacity = useRef(new Animated.Value(0)).current;
  const fabTranslateY = useRef(new Animated.Value(12)).current;
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('nearby');
  const [appliedFilters, setAppliedFilters] = useState<ExploreFilters>(EMPTY_EXPLORE_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ExploreFilters>(EMPTY_EXPLORE_FILTERS);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewMounted, setPreviewMounted] = useState(false);
  const previewBackdrop = useRef(new Animated.Value(0)).current;
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationBlockedVisible, setLocationBlockedVisible] = useState(false);
  const [lastKnownLocation, setLastKnownLocation] = useState<UserLocationCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState(() =>
    t('explore.auth.save'),
  );

  const {
    isSaved,
    getSaveCount,
    isSaving,
    pressSave,
  } = useSavePlaceWithCollections();
  const {
    isLiked,
    getLikeCount,
    isToggling: isLikeToggling,
    toggleLike,
  } = usePlaceLikes();
  const { unreadCount, refresh: refreshNotifications } = useNotifications(profile?.id);

  const mapboxError = getMapboxConfigError();
  const activeFilterCount = countActiveExploreFilters(appliedFilters);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        void refreshNotifications({ silent: true });
      }
    }, [profile?.id, refreshNotifications]),
  );

  const applyLocation = useCallback((longitude: number, latitude: number) => {
    setLastKnownLocation({ longitude, latitude });
  }, []);

  const flyToLocation = useCallback(
    (longitude: number, latitude: number, options?: MapCameraFlyOptions) => {
      // Bump generation so rapid taps only honor the latest target intent.
      cameraGenerationRef.current += 1;
      const generation = cameraGenerationRef.current;

      const from = lastCameraCenterRef.current ?? lastKnownLocation;
      const durationMs =
        options?.durationMs ?? estimateCameraDurationMs(from, latitude, longitude);
      const zoomLevel = options?.zoomLevel ?? 14;

      lastCameraCenterRef.current = { latitude, longitude };

      // Mapbox interrupts any in-flight camera animation when setCamera is called again.
      mapRef.current?.flyTo(longitude, latitude, durationMs, zoomLevel, {
        paddingTop: options?.paddingTop ?? 0,
        paddingBottom: options?.paddingBottom ?? 0,
        paddingLeft: options?.paddingLeft ?? 0,
        paddingRight: options?.paddingRight ?? 0,
        animationMode: options?.animationMode ?? 'easeTo',
      });

      return generation;
    },
    [lastKnownLocation],
  );

  const refreshLocation = useCallback(async (): Promise<UserLocationCoords | null> => {
    if (locateInFlightRef.current) {
      return lastKnownLocation;
    }

    locateInFlightRef.current = true;

    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        applyLocation(lastKnown.coords.longitude, lastKnown.coords.latitude);
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      };

      applyLocation(next.longitude, next.latitude);
      return next;
    } catch {
      return lastKnownLocation;
    } finally {
      locateInFlightRef.current = false;
    }
  }, [applyLocation, lastKnownLocation]);

  const lastPlacesFetchAtRef = useRef(0);
  const PLACES_STALE_MS = 60_000;

  const applyPlacesResult = useCallback((nextPlaces: Place[], error?: string | null) => {
    setPlaces(nextPlaces);

    if (mapInitialCenterRef.current == null && nextPlaces.length > 0) {
      mapInitialCenterRef.current = computePlacesCenter(nextPlaces);
      lastCameraCenterRef.current = {
        longitude: mapInitialCenterRef.current[0],
        latitude: mapInitialCenterRef.current[1],
      };
    }

    setLoadError(error ?? null);
  }, []);

  const loadPlaces = useCallback(async (options?: { background?: boolean }) => {
    if (!options?.background) {
      setLoadError(null);
    }

    try {
      if (!options?.background) {
        const cached = await readMapPlacesCache({ allowExpired: true });
        if (cached?.length) {
          applyPlacesResult(cached);
          setMapReady(true);
        }
      }

      const result = await loadPlacesForMap('nearby');
      lastPlacesFetchAtRef.current = Date.now();

      // Never wipe visible markers on a failed background refresh.
      if (options?.background && result.places.length === 0 && result.error) {
        setLoadError(result.error);
        return;
      }

      applyPlacesResult(result.places, result.fromCache ? (result.error ?? null) : null);
    } catch {
      const cached = await readMapPlacesCache({ allowExpired: true });
      if (cached?.length) {
        applyPlacesResult(cached, 'explore.load.cached');
      } else if (!options?.background) {
        applyPlacesResult([], 'explore.load.failed');
      } else {
        setLoadError('explore.load.refreshFailed');
      }
    } finally {
      setMapReady(true);
    }
  }, [applyPlacesResult]);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  useEffect(() => {
    let wasOffline = getNetworkStatus().isOffline;

    return subscribeNetworkStatus((status) => {
      if (wasOffline && !status.isOffline) {
        setLoadError(null);
        void loadPlaces({ background: true });
      }
      wasOffline = status.isOffline;
    });
  }, [loadPlaces]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!mapReady) {
        return;
      }
      if (Date.now() - lastPlacesFetchAtRef.current < PLACES_STALE_MS) {
        return;
      }
      void loadPlaces({ background: true });
    }, [loadPlaces, mapReady]),
  );

  useEffect(() => {
    let mounted = true;

    const setupLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const granted = status === 'granted';

        if (!mounted) {
          return;
        }

        setLocationGranted(granted);

        if (!granted) {
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && mounted) {
          applyLocation(lastKnown.coords.longitude, lastKnown.coords.latitude);
        }

        locationWatchRef.current?.remove();
        locationWatchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
          },
          (position) => {
            applyLocation(position.coords.longitude, position.coords.latitude);
          },
        );
      } catch {
        if (mounted) {
          setLocationGranted(false);
        }
      }
    };

    setupLocation();

    return () => {
      mounted = false;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [applyLocation]);

  const mapInitialCenter = mapInitialCenterRef.current ?? computePlacesCenter(places);

  const placesWithDistance = useMemo(
    () => withPlaceDistances(places, lastKnownLocation),
    [places, lastKnownLocation, settings.distanceUnit, i18n.language],
  );

  const filteredPlaces = useMemo(() => {
    const filtered = filterPlaces(placesWithDistance, {
      search,
      filters: appliedFilters,
      quickFilter,
    });

    return sortPlaces(filtered, quickFilter, lastKnownLocation);
  }, [placesWithDistance, search, appliedFilters, quickFilter, lastKnownLocation]);

  const selectedPlace = useMemo(
    () => (selectedId ? filteredPlaces.find((p) => p.id === selectedId) : null),
    [filteredPlaces, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    if (!filteredPlaces.some((place) => place.id === selectedId)) {
      // Close sheet first; selected marker clears after the exit animation.
      setPreviewVisible(false);
    }
  }, [filteredPlaces, selectedId]);

  useEffect(() => {
    void loadRecentSearches().then(setRecentSearches);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(topOverlayOpacity, {
        toValue: 1,
        duration: mapMotion.overlayMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(topOverlayTranslateY, {
        toValue: 0,
        duration: mapMotion.overlayMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [topOverlayOpacity, topOverlayTranslateY]);

  useEffect(() => {
    if (!mapReady && !mapboxError) {
      mapContentOpacity.setValue(0);
      return;
    }

    mapContentOpacity.setValue(0);
    Animated.timing(mapContentOpacity, {
      toValue: 1,
      duration: mapMotion.fadeMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mapContentOpacity, mapReady, mapboxError]);

  useEffect(() => {
    if (!mapReady) {
      fabOpacity.setValue(0);
      fabTranslateY.setValue(12);
      return;
    }

    Animated.parallel([
      Animated.timing(fabOpacity, {
        toValue: 1,
        duration: mapMotion.fadeMs,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fabTranslateY, {
        toValue: 0,
        duration: mapMotion.fadeMs,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fabOpacity, fabTranslateY, mapReady]);

  useEffect(() => {
    if (previewVisible) {
      setPreviewMounted(true);
      Animated.timing(previewBackdrop, {
        toValue: 1,
        duration: mapMotion.overlayMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(previewBackdrop, {
      toValue: 0,
      duration: mapMotion.overlayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [previewBackdrop, previewVisible]);

  const showPreviewSheet = previewMounted && selectedPlace != null;
  const noFilterMatches = mapReady && places.length > 0 && filteredPlaces.length === 0;

  const bottomOffset = tabBarInset.totalSpace;
  const fabStackBottom = showPreviewSheet
    ? bottomOffset + PLACE_PREVIEW_CARD_HEIGHT + spacing.lg
    : bottomOffset + spacing.lg;

  const placesRef = useRef(places);
  placesRef.current = places;
  const filteredPlacesRef = useRef(filteredPlaces);
  filteredPlacesRef.current = filteredPlaces;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const localizeLoadMessage = useCallback(
    (message: string | null | undefined): string | null => {
      if (!message) {
        return null;
      }
      if (
        message.startsWith('explore.') ||
        message.startsWith('map.') ||
        message.startsWith('network.')
      ) {
        return i18n.t(message as never);
      }
      return message;
    },
    [i18n],
  );

  const handleToggleSave = useCallback(async (placeId: string) => {
    if (isSaving(placeId)) {
      return;
    }

    const place = placesRef.current.find((item) => item.id === placeId);
    const currentCount = getSaveCount(placeId, place?.saveCount ?? 0);
    const result = await pressSave(placeId, {
      saveCount: currentCount,
      onSaveCountChange: (nextCount) => {
        setPlaces((prev) =>
          prev.map((item) =>
            item.id === placeId
              ? { ...item, saveCount: Math.max(0, nextCount) }
              : item,
          ),
        );
      },
    });

    if (result.requiresAuth) {
      setAuthPromptMessage(t('explore.auth.save'));
      setAuthPromptVisible(true);
    }
  }, [getSaveCount, isSaving, pressSave, t]);

  const handleToggleLike = useCallback(async (placeId: string) => {
    if (isLikeToggling(placeId)) {
      return;
    }

    if (!requireAuth(user, 'like_place')) {
      setAuthPromptMessage(t('explore.auth.like'));
      setAuthPromptVisible(true);
      return;
    }

    try {
      const place = placesRef.current.find((item) => item.id === placeId);
      const currentCount = getLikeCount(placeId, place?.likeCount ?? 0);
      const result = await toggleLike(placeId, currentCount);
      if (!result.success) {
        return;
      }

      if (typeof result.likeCount === 'number') {
        setPlaces((prev) =>
          prev.map((item) =>
            item.id === placeId
              ? { ...item, likeCount: Math.max(0, result.likeCount ?? item.likeCount) }
              : item,
          ),
        );
      }
    } catch {
      // toggleLike already surfaces errors; keep UI stable
    }
  }, [getLikeCount, isLikeToggling, toggleLike, user, t]);

  const handleSelectPlace = useCallback((placeId: string) => {
    const place = filteredPlacesRef.current.find((p) => p.id === placeId);
    if (!place) {
      return;
    }

    setSelectedId(placeId);
    setPreviewVisible(true);
    setSearchFocused(false);
    if (search.trim()) {
      void addRecentSearch(search).then(setRecentSearches);
    }

    // Keep marker above the preview card + tab bar, and below the search overlay.
    const paddingBottom = PLACE_PREVIEW_CARD_HEIGHT + tabBarInset.totalSpace + spacing.md;
    const paddingTop = insets.top + 108;
    flyToLocation(place.longitude, place.latitude, {
      paddingBottom,
      paddingTop,
      zoomLevel: 14,
      animationMode: 'easeTo',
    });
  }, [flyToLocation, insets.top, search, tabBarInset.totalSpace]);

  const handleSelectRecentSearch = (query: string) => {
    setSearch(query);
    void addRecentSearch(query).then(setRecentSearches);
  };

  const handleRemoveRecentSearch = (query: string) => {
    void removeRecentSearch(query).then(setRecentSearches);
  };

  const handleSearchSubmit = (query: string) => {
    void addRecentSearch(query).then(setRecentSearches);
  };

  const searchPanelVisible =
    searchFocused || search.trim().length > 0;

  const searchPanelMaxHeight = useMemo(() => {
    if (keyboardHeight <= 0) {
      return 320;
    }

    const windowHeight = Dimensions.get('window').height;
    const topOverhead = insets.top + spacing.sm + 56 + spacing.sm;
    const chipsHeight = 44 + spacing.xs;
    const available =
      windowHeight - keyboardHeight - topOverhead - chipsHeight - tabBarInset.height - spacing.md;

    return Math.max(120, Math.min(320, available));
  }, [insets.top, keyboardHeight, tabBarInset.height]);

  const handleQuickFilter = (key: QuickFilter) => {
    setQuickFilter(key);
    if (key === 'nearby' && !lastKnownLocation) {
      showToast(t('map.location.enableForSort'));
    }
  };

  const openFilterPanel = () => {
    setDraftFilters(appliedFilters);
    setFilterPanelVisible(true);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setFilterPanelVisible(false);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_EXPLORE_FILTERS);
    setAppliedFilters(EMPTY_EXPLORE_FILTERS);
  };

  const handleLocate = async () => {
    const locatePadding = {
      paddingTop: insets.top + 108,
      paddingBottom: tabBarInset.totalSpace + spacing.lg,
      zoomLevel: 14,
      animationMode: 'easeTo' as const,
    };

    try {
      const permission = await ensureLocationPermission();
      if (!permission.granted) {
        if (permission.shouldOpenSettings) {
          setLocationBlockedVisible(true);
        } else {
          showToast(t('map.location.permissionDenied'));
        }
        setLocationGranted(false);
        return;
      }

      setLocationGranted(true);

      const cached = lastKnownLocation;

      if (cached) {
        flyToLocation(cached.longitude, cached.latitude, locatePadding);
      } else {
        setLocating(true);
      }

      const locateToken = cameraGenerationRef.current;

      void refreshLocation().then((refreshed) => {
        setLocating(false);

        if (!refreshed) {
          if (!cached) {
            showToast(t('map.location.unavailable'));
          }
          return;
        }

        // Ignore stale locate results if another camera action happened since.
        if (cameraGenerationRef.current !== locateToken) {
          return;
        }

        if (!cached || locationsDiffer(cached, refreshed)) {
          flyToLocation(refreshed.longitude, refreshed.latitude, locatePadding);
        }
      });
    } catch {
      setLocating(false);
      showToast(t('map.location.unavailable'));
    }
  };

  const renderMapLayer = () => {
    if (mapboxError) {
      return (
        <Animated.View
          style={[
            styles.mapFallback,
            {
              backgroundColor: colors.background,
              opacity: mapContentOpacity,
            },
          ]}
        >
          <View style={[styles.mapFallbackIcon, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="map-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.mapFallbackTitle, { color: colors.textPrimary }]}>{t('map.unavailable')}</Text>
          <Text style={[styles.mapFallbackText, { color: colors.textMuted }]}>{mapboxError}</Text>
        </Animated.View>
      );
    }

    if (!mapReady) {
      return (
        <View style={[styles.mapFallback, { backgroundColor: colors.background }]}>
          <View style={[styles.mapLoadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.mapFallbackText, { color: colors.textMuted }]}>{t('map.loading')}</Text>
            <View style={styles.mapSkeletonRow}>
              <View style={[styles.mapSkeletonChip, { backgroundColor: colors.surfaceSecondary }]} />
              <View style={[styles.mapSkeletonChip, { backgroundColor: colors.surfaceSecondary }]} />
              <View style={[styles.mapSkeletonChip, { backgroundColor: colors.surfaceSecondary }]} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.mapLayerFill, { opacity: mapContentOpacity }]}>
        <PlaceMapView
          mapRef={mapRef}
          places={filteredPlaces}
          selectedPlaceId={selectedId}
          onSelectPlace={handleSelectPlace}
          showUserLocation={locationGranted}
          initialCenter={mapInitialCenter}
        />
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.mapLayer}>{renderMapLayer()}</View>

      {searchFocused ? (
        <Pressable
          style={styles.keyboardDismissBackdrop}
          onPress={Keyboard.dismiss}
          accessibilityRole="button"
          accessibilityLabel={t('explore.a11y.dismissKeyboard')}
        />
      ) : null}

      <Animated.View
        style={[
          styles.topOverlay,
          {
            paddingTop: insets.top + spacing.sm,
            opacity: topOverlayOpacity,
            transform: [{ translateY: topOverlayTranslateY }],
          },
        ]}
      >
        <View style={styles.searchRow}>
          <View style={styles.searchFlex}>
            <ExploreSearchBar
              value={search}
              onChangeText={setSearch}
              onFilterPress={openFilterPanel}
              activeFilterCount={activeFilterCount}
              onFocusChange={setSearchFocused}
              onSubmit={handleSearchSubmit}
            />
          </View>
          {user ? (
            <NotificationBellButton
              unreadCount={unreadCount}
              onPress={() => navigation.navigate(MAP_ROUTES.NOTIFICATIONS)}
            />
          ) : null}
        </View>

        <ExploreSearchResults
          visible={searchPanelVisible}
          query={search}
          results={filteredPlaces}
          loading={!mapReady && places.length === 0}
          recentSearches={recentSearches}
          maxPanelHeight={searchPanelMaxHeight}
          onSelectPlace={handleSelectPlace}
          onSelectRecent={handleSelectRecentSearch}
          onRemoveRecent={handleRemoveRecentSearch}
          onRequiresAuth={() => {
            setAuthPromptMessage(t('explore.auth.save'));
            setAuthPromptVisible(true);
          }}
          onSaveCountChange={(placeId, nextCount) => {
            setPlaces((prev) =>
              prev.map((item) =>
                item.id === placeId
                  ? { ...item, saveCount: Math.max(0, nextCount) }
                  : item,
              ),
            );
          }}
        />

        {loadError ? (
          <MapInlineNotice
            message={
              places.length > 0
                ? (localizeLoadMessage(loadError) ?? loadError)
                : t('explore.empty.offline')
            }
            icon="cloud-offline-outline"
            tone="accent"
          />
        ) : null}

        {mapReady && places.length === 0 && !loadError ? (
          <MapInlineNotice
            message={t('explore.empty.noPlaces')}
            icon="leaf-outline"
            tone="primary"
          />
        ) : null}

        {noFilterMatches && !search.trim() ? (
          <MapInlineNotice
            message={t('explore.empty.noFilterMatches')}
            icon="funnel-outline"
            tone="accent"
          />
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          {QUICK_FILTERS.map((option) => (
            <SortChip
              key={option.key}
              label={t(option.labelKey)}
              icon={option.icon}
              active={quickFilter === option.key}
              onPress={() => handleQuickFilter(option.key)}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {toastMessage ? (
        <View style={[styles.toastWrap, { top: insets.top + 108 }]}>
          <ToastBanner
            message={toastMessage}
            visible={toastMessage != null}
            onDismiss={() => setToastMessage(null)}
          />
        </View>
      ) : null}

      <ExploreFiltersPanel
        visible={filterPanelVisible}
        draftFilters={draftFilters}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClose={() => setFilterPanelVisible(false)}
        onClear={clearFilters}
      />

      <Animated.View
        style={[
          styles.locateFab,
          {
            bottom: fabStackBottom,
            opacity: fabOpacity,
            transform: [{ translateY: fabTranslateY }],
          },
        ]}
        pointerEvents={mapReady ? 'box-none' : 'none'}
      >
        <MapFabButton
          icon="locate"
          accessibilityLabel={t('map.a11y.myLocation')}
          onPress={handleLocate}
          loading={locating}
        />
      </Animated.View>

      {showPreviewSheet && selectedPlace ? (
        <>
          <Animated.View
            pointerEvents={previewVisible ? 'auto' : 'none'}
            style={[
              styles.previewBackdrop,
              {
                opacity: previewBackdrop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.16],
                }),
                backgroundColor: colors.scrimDark,
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPreviewVisible(false)}
              accessibilityLabel={t('explore.preview.a11yDismiss')}
            />
          </Animated.View>
          <View
            style={[styles.preview, { bottom: bottomOffset }]}
            pointerEvents="box-none"
          >
            <PlacePreviewCard
              place={selectedPlace}
              visible={previewVisible}
              saved={isSaved(selectedPlace.id)}
              saveDisabled={isSaving(selectedPlace.id)}
              onSave={() => {
                void handleToggleSave(selectedPlace.id);
              }}
              liked={isLiked(selectedPlace.id)}
              likeCount={getLikeCount(selectedPlace.id, selectedPlace.likeCount)}
              likeDisabled={isLikeToggling(selectedPlace.id)}
              onLike={() => {
                void handleToggleLike(selectedPlace.id);
              }}
              onClose={() => setPreviewVisible(false)}
              onHidden={() => {
                setPreviewMounted(false);
                setSelectedId(null);
              }}
              onDetails={() =>
                navigation.navigate(MAP_ROUTES.PLACE_DETAIL, { placeId: selectedPlace.id })
              }
              onNavigate={() => {
                void openExternalDirections(
                  selectedPlace.latitude,
                  selectedPlace.longitude,
                  selectedPlace.title,
                ).then((opened) => {
                  if (!opened) {
                    showToast(t('map.directions.failed'));
                  }
                });
              }}
            />
          </View>
        </>
      ) : null}

      <AuthRequiredModal
        visible={authPromptVisible}
        message={authPromptMessage}
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />
      <PermissionBlockedModal
        visible={locationBlockedVisible}
        title={t('map.location.blockedTitle')}
        message={t('map.location.blockedMessage')}
        onCancel={() => setLocationBlockedVisible(false)}
        onOpenSettings={() => {
          setLocationBlockedVisible(false);
          void openAppSettings();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapLayer: {
    ...StyleSheet.absoluteFill,
  },
  keyboardDismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  mapLayerFill: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  mapLoadingCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 220,
  },
  mapSkeletonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  mapSkeletonChip: {
    width: 48,
    height: 10,
    borderRadius: 5,
  },
  mapFallbackIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  mapFallbackTitle: {
    ...typography.subtitle,
    fontSize: 16,
  },
  mapFallbackText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  topOverlay: {
    zIndex: 10,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  searchFlex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
    paddingTop: spacing.xs,
  },
  toastWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 40,
    alignItems: 'center',
  },
  locateFab: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 30,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 18,
  },
  preview: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
});
