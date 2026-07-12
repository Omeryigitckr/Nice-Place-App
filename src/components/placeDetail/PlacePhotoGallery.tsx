import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';

import { CachedImage } from '../CachedImage';

interface PlacePhotoGalleryProps {
  images: string[];
  onImagePress: (index: number) => void;
}

export function PlacePhotoGallery({ images, onImagePress }: PlacePhotoGalleryProps) {
  const { t } = useTranslation();
  if (images.length <= 1) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('placeDetail.gallery')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {images.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            onPress={() => onImagePress(index)}
            style={styles.thumbWrap}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('placeDetail.photos.viewPhoto', { index: index + 1 })}
          >
            <CachedImage
              uri={uri}
              width={140}
              height={100}
              borderRadius={radius.lg}
              recyclingKey={`gallery-${uri}-${index}`}
              priority="low"
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

interface PlacePhotoViewerProps {
  images: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

export function PlacePhotoViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: PlacePhotoViewerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerBackdrop}>
        <Animated.View style={[styles.viewerContent, { opacity }]}>
          <Image
            source={{ uri: images[initialIndex] }}
            style={styles.viewerImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            onLoad={() => {
              Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            }}
          />
        </Animated.View>

        <Pressable
          onPress={onClose}
          style={[styles.viewerClose, { top: insets.top + spacing.sm }]}
          accessibilityRole="button"
          accessibilityLabel={t('placeDetail.photos.closeViewer')}
        >
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  scroll: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  thumbWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  thumb: {
    width: 140,
    height: 100,
    backgroundColor: colors.surfaceElevated,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerContent: {
    width: '100%',
    height: '72%',
    paddingHorizontal: spacing.md,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerClose: {
    position: 'absolute',
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.scrimHeavy,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
