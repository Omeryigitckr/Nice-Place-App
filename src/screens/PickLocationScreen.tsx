import Mapbox, { Camera, MapView, MapState, StyleURL } from '@rnmapbox/maps';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppButton } from '../components';
import { MAP_ROUTES } from '../constants';
import { useFloatingTabBarInset } from '../hooks';
import { publishLocationPickerResult } from '../navigation/locationPickerResult';
import { duration, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AddPlaceStackParamList, MapStackParamList } from '../types';
import { getMapboxConfigError, getMapboxToken } from '../utils/mapbox';
import { devLog } from '../utils/devLog';

type Props = NativeStackScreenProps<
  MapStackParamList | AddPlaceStackParamList,
  typeof MAP_ROUTES.PICK_LOCATION
>;

export function PickLocationScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useFloatingTabBarInset();
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const initialLatitude = route.params.latitude;
  const initialLongitude = route.params.longitude;
  const cameraRef = useRef<ComponentRef<typeof Camera>>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [selectedLatitude, setSelectedLatitude] = useState(initialLatitude);
  const [selectedLongitude, setSelectedLongitude] = useState(initialLongitude);
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(16)).current;

  const mapboxError = getMapboxConfigError();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelTranslateY, {
        toValue: 0,
        duration: duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [panelOpacity, panelTranslateY]);

  useEffect(() => {
    const token = getMapboxToken();
    if (!token) {
      return;
    }

    Mapbox.setAccessToken(token)
      .then(() => setTokenReady(true))
      .catch(() => setTokenReady(false));
  }, []);

  const handleCameraChanged = useCallback((state: MapState) => {
    const [longitude, latitude] = state.properties.center;
    setSelectedLongitude(longitude);
    setSelectedLatitude(latitude);
  }, []);

  const handleConfirm = () => {
    // Publish result then goBack so Add/Edit Place stay mounted (form state preserved).
    const result = {
      latitude: selectedLatitude,
      longitude: selectedLongitude,
    };
    devLog('[Nice Place PickLocation] confirm', {
      returnTo: route.params.returnTo ?? MAP_ROUTES.ADD_PLACE,
      placeId: route.params.placeId ?? null,
      ...result,
    });
    publishLocationPickerResult(result);
    navigation.goBack();
  };

  if (mapboxError) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background }]}>
        <Text style={[styles.fallbackTitle, { color: colors.textPrimary }]}>{t('map.unavailable')}</Text>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>{mapboxError}</Text>
        <AppButton title={t('map.pickLocation.goBack')} onPress={() => navigation.goBack()} fullWidth={false} />
      </View>
    );
  }

  if (!tokenReady) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        style={styles.map}
        styleURL={StyleURL.Outdoors}
        scaleBarEnabled={false}
        onCameraChanged={handleCameraChanged}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialLongitude, initialLatitude],
            zoomLevel: 15,
          }}
        />
      </MapView>

      <View style={styles.pinOverlay} pointerEvents="none">
        <View style={styles.pinShadow} />
        <Ionicons name="location" size={36} color={colors.accent} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Text
          style={[
            styles.instruction,
            {
              color: colors.textPrimary,
              backgroundColor: colors.scrimHeavy,
              borderColor: colors.glassBorder,
            },
          ]}
        >
          {t('map.pickLocation.instruction')}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.bottomPanel,
          {
            paddingBottom: tabBarInset.totalSpace,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            opacity: panelOpacity,
            transform: [{ translateY: panelTranslateY }],
            ...shadows.sm,
          },
        ]}
      >
        <Text style={[styles.coordsLabel, { color: colors.textMuted }]}>{t('map.pickLocation.selected')}</Text>
        <Text style={[styles.coordsValue, { color: colors.textPrimary }]}>
          {selectedLatitude.toFixed(5)}, {selectedLongitude.toFixed(5)}
        </Text>
        <View style={styles.actions}>
          <AppButton title={t('map.pickLocation.confirm')} onPress={handleConfirm} />
          <AppButton title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  pinShadow: {
    position: 'absolute',
    bottom: '50%',
    marginBottom: -2,
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
  },
  instruction: {
    ...typography.bodySmall,
    textAlign: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  coordsLabel: {
    ...typography.caption,
  },
  coordsValue: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  fallbackTitle: {
    ...typography.subtitle,
  },
  fallbackText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
