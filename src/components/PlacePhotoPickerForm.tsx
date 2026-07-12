import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { MAX_PLACE_PHOTOS } from '../services/placePhotoService';
import { radius, spacing, typography } from '../theme';
import { motion, motionEasing } from '../theme/motion';
import { useThemeColors } from '../theme/ThemeContext';

import { AppButton } from './AppButton';
import { PermissionBlockedModal } from './PermissionBlockedModal';
import { ensureMediaPermission, openAppSettings } from '../services/appPermissionsService';

export interface PlacePhotoPickerItem {
  id: string;
  uri: string;
}

interface PlacePhotoPickerFormProps {
  photos: PlacePhotoPickerItem[];
  onChange: (photos: PlacePhotoPickerItem[]) => void;
  required?: boolean;
}

function createPhotoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PlacePhotoPickerForm({
  photos,
  onChange,
  required = true,
}: PlacePhotoPickerFormProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const pressScale = useRef(new Animated.Value(1)).current;
  const [blockedVisible, setBlockedVisible] = useState(false);

  const handlePickPhotos = async () => {
    if (photos.length >= MAX_PLACE_PHOTOS) {
      return;
    }

    const permission = await ensureMediaPermission();
    if (!permission.granted) {
      if (permission.shouldOpenSettings) {
        setBlockedVisible(true);
      }
      return;
    }

    const remaining = MAX_PLACE_PHOTOS - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const next = [
      ...photos,
      ...result.assets.slice(0, remaining).map((asset) => ({
        id: createPhotoId(),
        uri: asset.uri,
      })),
    ];

    onChange(next);
  };

  const handleRemove = (id: string) => {
    onChange(photos.filter((photo) => photo.id !== id));
  };

  const handleSetCover = (id: string) => {
    const index = photos.findIndex((photo) => photo.id === id);
    if (index <= 0) {
      return;
    }

    const next = [...photos];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onChange(next);
  };

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  const addLabel =
    photos.length === 0
      ? required
        ? t('placeForm.photos.addRequired')
        : t('placeForm.photos.addOptional')
      : t('placeForm.photos.addMore', { count: photos.length, max: MAX_PLACE_PHOTOS });

  return (
    <View style={styles.wrap}>
      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
        >
          {photos.map((photo, index) => (
            <View key={photo.id} style={styles.thumbWrap}>
              <Image
                source={{ uri: photo.uri }}
                style={[styles.thumb, { backgroundColor: colors.surfaceSecondary }]}
                resizeMode="cover"
              />
              {index === 0 ? (
                <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.coverBadgeText, { color: colors.textInverse }]}>
                    {t('placeForm.photos.cover')}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleSetCover(photo.id)}
                  style={[styles.makeCoverButton, { backgroundColor: colors.scrimHeavy }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('placeForm.photos.setCoverA11y')}
                >
                  <Text style={[styles.makeCoverText, { color: colors.textPrimary }]}>
                    {t('placeForm.photos.setCover')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => handleRemove(photo.id)}
                style={[styles.removeButton, { backgroundColor: colors.scrimHeavy }]}
                accessibilityRole="button"
                accessibilityLabel={t('placeForm.photos.removeA11y')}
              >
                <Ionicons name="close" size={14} color={colors.textPrimary} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {photos.length < MAX_PLACE_PHOTOS ? (
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <Pressable
            style={[
              styles.photoPicker,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            onPress={() => {
              void handlePickPhotos();
            }}
            onPressIn={() => animatePress(motion.scale.press)}
            onPressOut={() => animatePress(1)}
          >
            <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.photoPickerText, { color: colors.textSecondary }]}>
              {addLabel}
            </Text>
            <Text style={[styles.photoPickerSubtext, { color: colors.textMuted }]}>
              {t('placeForm.photos.firstIsCover')}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {photos.length > 0 ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          {t('placeForm.photos.selectedHint', {
            count: photos.length,
            max: MAX_PLACE_PHOTOS,
          })}
        </Text>
      ) : null}

      <PermissionBlockedModal
        visible={blockedVisible}
        title={t('permissions.photos.blockedTitle')}
        message={t('permissions.photos.blockedMessage')}
        onCancel={() => setBlockedVisible(false)}
        onOpenSettings={() => {
          setBlockedVisible(false);
          void openAppSettings();
        }}
      />
    </View>
  );
}

export function createPlacePhotoPickerItem(uri: string): PlacePhotoPickerItem {
  return { id: createPhotoId(), uri };
}

/** @deprecated Use PlacePhotoPickerForm */
export function PlacePhotoPickerLegacyActions({
  onPick,
  onRemove,
  hasPhoto,
}: {
  onPick: () => void;
  onRemove: () => void;
  hasPhoto: boolean;
}) {
  const { t } = useTranslation();

  if (!hasPhoto) {
    return null;
  }

  return (
    <View style={styles.legacyActions}>
      <AppButton
        title={t('placeForm.photos.changePhoto')}
        variant="secondary"
        onPress={onPick}
        fullWidth={false}
      />
      <AppButton
        title={t('common.remove')}
        variant="ghost"
        onPress={onRemove}
        fullWidth={false}
      />
    </View>
  );
}

const THUMB_SIZE = 112;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  thumbRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  coverBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  makeCoverButton: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    bottom: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  makeCoverText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPicker: {
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  photoPickerText: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoPickerSubtext: {
    ...typography.caption,
    textAlign: 'center',
  },
  helperText: {
    ...typography.caption,
  },
  legacyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
