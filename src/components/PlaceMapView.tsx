import Mapbox, { Camera, MapView, MarkerView, StyleURL, UserLocation } from '@rnmapbox/maps';
import { ComponentRef, memo, Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { devWarn } from '../utils/devLog';

import { useAppSettings } from '../hooks/useAppSettings';
import { MapStylePreference } from '../services/settingsService';
import { Place } from '../types/place';
import { DEFAULT_MAP_CENTER, getMapboxToken } from '../utils/mapbox';

import { PlaceMarker } from './PlaceMarker';

function mapStyleToUrl(style: MapStylePreference): string {
  switch (style) {
    case 'satellite':
      return StyleURL.Satellite;
    case 'standard':
      return StyleURL.Street;
    case 'outdoors':
    default:
      return StyleURL.Outdoors;
  }
}

export interface PlaceMapCameraOptions {
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  animationMode?: 'easeTo' | 'flyTo' | 'linearTo' | 'moveTo';
}

export interface PlaceMapViewHandle {
  flyTo: (
    longitude: number,
    latitude: number,
    duration?: number,
    zoomLevel?: number,
    options?: PlaceMapCameraOptions,
  ) => void;
}

interface PlaceMapViewProps {
  places: Place[];
  selectedPlaceId?: string | null;
  onSelectPlace: (placeId: string) => void;
  mapRef?: Ref<PlaceMapViewHandle>;
  showUserLocation?: boolean;
  initialCenter?: [number, number];
}

interface MapCameraProps {
  cameraRef: Ref<ComponentRef<typeof Camera>>;
  initialCenter: [number, number];
}

const MapCamera = memo(function MapCamera({ cameraRef, initialCenter }: MapCameraProps) {
  return (
    <Camera
      ref={cameraRef}
      defaultSettings={{
        centerCoordinate: initialCenter,
        zoomLevel: 11,
      }}
    />
  );
});

export function PlaceMapView({
  places,
  selectedPlaceId,
  onSelectPlace,
  mapRef,
  showUserLocation = false,
  initialCenter = DEFAULT_MAP_CENTER,
}: PlaceMapViewProps) {
  const { settings } = useAppSettings();
  const mapStyleUrl = useMemo(() => mapStyleToUrl(settings.mapStyle), [settings.mapStyle]);
  const cameraRef = useRef<ComponentRef<typeof Camera>>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const initialCenterRef = useRef<[number, number]>(initialCenter);

  useImperativeHandle(mapRef, () => ({
    flyTo: (
      longitude: number,
      latitude: number,
      duration = 450,
      zoomLevel = 14,
      options?: PlaceMapCameraOptions,
    ) => {
      // Latest setCamera call wins — Mapbox interrupts in-flight camera animations.
      cameraRef.current?.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel,
        animationDuration: duration,
        animationMode: options?.animationMode ?? 'easeTo',
        padding: {
          paddingTop: options?.paddingTop ?? 0,
          paddingBottom: options?.paddingBottom ?? 0,
          paddingLeft: options?.paddingLeft ?? 0,
          paddingRight: options?.paddingRight ?? 0,
        },
      });
    },
  }));

  useEffect(() => {
    const token = getMapboxToken();
    if (!token) {
      return;
    }

    Mapbox.setAccessToken(token)
      .then(() => setTokenReady(true))
      .catch((error: unknown) => {
        devWarn('[Nice Place] Mapbox token init failed:', error);
      });
  }, []);

  if (!tokenReady) {
    return null;
  }

  return (
    <MapView style={styles.map} styleURL={mapStyleUrl} scaleBarEnabled={false}>
      <MapCamera cameraRef={cameraRef} initialCenter={initialCenterRef.current} />
      {showUserLocation ? <UserLocation visible animated /> : null}
      {places.map((place) => {
        const selected = place.id === selectedPlaceId;

        return (
          <MarkerView
            key={place.id}
            coordinate={[place.longitude, place.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
            isSelected={selected}
          >
            <PlaceMarker
              title={place.title}
              selected={selected}
              onPress={() => onSelectPlace(place.id)}
            />
          </MarkerView>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
