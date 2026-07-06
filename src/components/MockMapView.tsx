import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { Place } from '../types/place';

import { PlaceMarker } from './PlaceMarker';

interface MockMapViewProps {
  places: Place[];
  selectedPlaceId: string;
  onSelectPlace: (placeId: string) => void;
}

export function MockMapView({ places, selectedPlaceId, onSelectPlace }: MockMapViewProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.gridH1} />
      <View style={styles.gridH2} />
      <View style={styles.gridH3} />
      <View style={styles.gridV1} />
      <View style={styles.gridV2} />
      <View style={styles.road1} />
      <View style={styles.road2} />
      <View style={styles.road3} />
      <View style={styles.glow} />

      {layout.width > 0 &&
        places.map((place) => {
          const selected = place.id === selectedPlaceId;
          const left = place.mapPosition.x * layout.width - 18;
          const top = place.mapPosition.y * layout.height - 18;

          return (
            <View
              key={place.id}
              style={[styles.markerWrap, selected && styles.markerSelected, { left, top }]}
            >
              <PlaceMarker
                title={place.title}
                selected={selected}
                onPress={() => onSelectPlace(place.id)}
              />
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1018',
    overflow: 'hidden',
  },
  gridH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '25%',
    height: 1,
    backgroundColor: colors.mapGrid,
  },
  gridH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: colors.mapGrid,
  },
  gridH3: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '75%',
    height: 1,
    backgroundColor: colors.mapGrid,
  },
  gridV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: colors.mapGrid,
  },
  gridV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 1,
    backgroundColor: colors.mapGrid,
  },
  road1: {
    position: 'absolute',
    left: '10%',
    right: '20%',
    top: '40%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.mapRoad,
    transform: [{ rotate: '-8deg' }],
  },
  road2: {
    position: 'absolute',
    left: '30%',
    right: '15%',
    top: '62%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.mapRoad,
    transform: [{ rotate: '12deg' }],
  },
  road3: {
    position: 'absolute',
    left: '45%',
    width: 3,
    top: '15%',
    bottom: '20%',
    borderRadius: 2,
    backgroundColor: colors.mapRoad,
  },
  glow: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(61, 155, 110, 0.06)',
  },
  markerWrap: {
    position: 'absolute',
    zIndex: 1,
  },
  markerSelected: {
    zIndex: 10,
  },
});
