import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { devLog, devError } from '../utils/devLog';

import { uploadProfileAvatar } from '../services/avatarService';
import { duration, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';

const calmEasing = Easing.out(Easing.cubic);

import { FeedbackModal } from './FeedbackModal';

interface ProfileAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  profileId?: string;
  authUserId?: string;
  previousStoragePath?: string | null;
  size?: number;
  editable?: boolean;
  onAvatarUpdated?: (avatarUrl: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ProfileAvatar({
  displayName,
  avatarUrl,
  profileId,
  authUserId,
  previousStoragePath,
  size = 96,
  editable = false,
  onAvatarUpdated,
  onError,
}: ProfileAvatarProps) {
  const colors = useThemeColors();
  const [uploading, setUploading] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Could not update profile photo.');
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (avatarUrl) {
      setLocalUri(avatarUrl);
    }
  }, [avatarUrl]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(entranceScale, {
        toValue: 1,
        duration: duration.slow,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceScale]);

  const imageUri = localUri ?? avatarUrl ?? null;
  const borderRadius = size / 2;

  const reportError = useCallback(
    (message: string) => {
      devError('[Nice Place Profile] avatar upload failed:', message);
      setErrorMessage(message);
      setErrorVisible(true);
      onError?.(message);
    },
    [onError],
  );

  const handlePickAvatar = useCallback(async () => {
    if (!editable || uploading) {
      return;
    }

    devLog('[Nice Place Profile] avatar pick started');

    if (!profileId || !authUserId) {
      reportError('Sign in is required to change your profile photo.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      reportError('Photo library permission is required to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const pickedUri = result.assets[0].uri;
    devLog('[Nice Place Profile] selected avatar uri:', pickedUri);

    setLocalUri(pickedUri);
    setUploading(true);

    const uploadResult = await uploadProfileAvatar({
      profileId,
      authUserId,
      imageUri: pickedUri,
      previousStoragePath,
    });

    setUploading(false);

    if (!uploadResult.success || !uploadResult.avatarUrl) {
      setLocalUri(avatarUrl ?? null);
      reportError(uploadResult.error ?? 'Could not upload avatar.');
      return;
    }

    setLocalUri(uploadResult.avatarUrl);
    await onAvatarUpdated?.(uploadResult.avatarUrl);
  }, [
    authUserId,
    avatarUrl,
    editable,
    onAvatarUpdated,
    previousStoragePath,
    profileId,
    reportError,
    uploading,
  ]);

  const content = (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.primary,
        },
      ]}
    >
      {imageUri ? (
        <Image
          key={imageUri}
          source={{ uri: imageUri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.32, color: colors.primary }]}>
          {getInitials(displayName)}
        </Text>
      )}
      {uploading ? (
        <View style={[styles.overlay, { borderRadius, backgroundColor: colors.scrim }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {editable ? (
        <View
          style={[
            styles.editBadge,
            {
              backgroundColor: colors.primary,
              borderColor: colors.background,
            },
          ]}
        >
          <Ionicons name="camera" size={14} color={colors.white} />
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <Animated.View
        style={{
          opacity: entranceOpacity,
          transform: [{ scale: entranceScale }],
        }}
      >
        {editable ? (
          <Pressable
            onPress={handlePickAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={uploading}
          >
            {content}
          </Pressable>
        ) : (
          content
        )}
      </Animated.View>

      <FeedbackModal
        visible={errorVisible}
        variant="error"
        title="Photo upload failed"
        subtitle={errorMessage}
        primaryLabel="Try again"
        onPrimary={() => {
          setErrorVisible(false);
          void handlePickAvatar();
        }}
        secondaryLabel="Cancel"
        onSecondary={() => setErrorVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {},
  initials: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
