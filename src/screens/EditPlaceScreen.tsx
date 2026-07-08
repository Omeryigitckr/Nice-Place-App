import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  clearLocationPickerResult,
  consumeLocationPickerResult,
} from '../navigation/locationPickerResult';
import { devError } from '../utils/devLog';

import {
  AppButton,
  AppCard,
  AppTextInput,
  EmptyState,
  FilterChip,
  ScreenContainer,
  SectionHeader,
} from '../components';
import { AuthRequiredModal } from '../components/AuthRequiredModal';
import { FeedbackModal } from '../components/FeedbackModal';
import {
  ACCESS_TYPE_OPTIONS,
  ADD_PLACE_CATEGORIES,
  BEST_TIME_OPTIONS,
  CROWD_LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  FACILITY_TOGGLES,
  MAP_ROUTES,
} from '../constants';
import type { AddPlaceCategoryValue, BestTimeOption, FacilityToggleKey } from '../constants';
import { useAuth } from '../hooks';
import {
  getMyPlaceById,
  resolveCurrentUserProfileId,
  updateMyPlace,
  uploadPlaceCoverPhoto,
} from '../services';
import { radius, spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';
import { MapStackParamList } from '../types';
import { navigateToAuth, requireAuth } from '../utils/authGuard';

type Props = NativeStackScreenProps<MapStackParamList, typeof MAP_ROUTES.EDIT_PLACE>;

interface FacilityState {
  isPetFriendly: boolean;
  isChildFriendly: boolean;
  isCarAccessible: boolean;
  isCampAllowed: boolean;
  isPicnicSuitable: boolean;
}

interface SelectedPhoto {
  uri: string;
}

export function EditPlaceScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { user, profile, loading: authLoading } = useAuth();
  const placeId = route.params.placeId;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AddPlaceCategoryValue | null>(null);
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [locationLabel, setLocationLabel] = useState('Loading location…');
  const [bestTime, setBestTime] = useState<BestTimeOption>('Anytime');
  const [accessType, setAccessType] = useState<DbAccessType>('unknown');
  const [difficultyLevel, setDifficultyLevel] = useState<DbDifficultyLevel>('unknown');
  const [crowdLevel, setCrowdLevel] = useState<DbCrowdLevel>('unknown');
  const [facilities, setFacilities] = useState<FacilityState>({
    isPetFriendly: false,
    isChildFriendly: false,
    isCarAccessible: false,
    isCampAllowed: false,
    isPicnicSuitable: false,
  });
  const [safetyNote, setSafetyNote] = useState('');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [placeStatus, setPlaceStatus] = useState<'approved' | 'rejected' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    'Your changes were submitted for review.',
  );
  const [photoErrorVisible, setPhotoErrorVisible] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);

  // Location picker publishes a one-shot result and goBack() — only update coords.
  useFocusEffect(
    useCallback(() => {
      const result = consumeLocationPickerResult();
      if (!result) {
        return;
      }

      setLatitude(result.latitude);
      setLongitude(result.longitude);
      const address = result.addressText?.trim();
      setLocationLabel(address || 'Location adjusted on map');
      navigation.setParams({
        latitude: undefined,
        longitude: undefined,
        locationAdjusted: undefined,
      });
    }, [navigation]),
  );

  useEffect(() => {
    let mounted = true;

    const loadPlace = async () => {
      // Wait for auth/profile bootstrap before deciding signed-out state.
      if (authLoading) {
        setLoading(true);
        setError(null);
        return;
      }

      if (!user) {
        if (mounted) {
          setError(null);
          setLoading(false);
          setAuthPromptVisible(true);
        }
        return;
      }

      setError(null);
      setLoading(true);

      let profileId = profile?.id ?? null;
      if (!profileId) {
        const resolved = await resolveCurrentUserProfileId();
        profileId = resolved.profileId;
        if (!profileId) {
          if (mounted) {
            setError(
              resolved.error ??
                'Your account is signed in, but your profile could not be loaded. Try signing out and back in.',
            );
            setLoading(false);
          }
          return;
        }
      }

      const place = await getMyPlaceById(placeId, profileId);
      if (!mounted) {
        return;
      }

      if (!place) {
        setError('Place not found or you do not have permission to edit it.');
        setLoading(false);
        return;
      }

      if (place.status === 'pending') {
        setBlockedMessage('This place is still pending review and cannot be updated yet.');
        setLoading(false);
        return;
      }

      if (place.status !== 'approved' && place.status !== 'rejected') {
        setBlockedMessage('This place cannot be edited.');
        setLoading(false);
        return;
      }

      setBlockedMessage(null);
      setPlaceStatus(place.status);
      setTitle(place.title);
      setCategory(place.categorySlug as AddPlaceCategoryValue);
      setDescription(place.description);
      setLatitude(place.latitude);
      setLongitude(place.longitude);
      setLocationLabel('Current place location');
      setBestTime((place.bestTime as BestTimeOption) || 'Anytime');
      setAccessType((place.accessTypeSlug as DbAccessType) || 'unknown');
      setDifficultyLevel((place.difficultySlug as DbDifficultyLevel) || 'unknown');
      setCrowdLevel((place.crowdLevelSlug as DbCrowdLevel) || 'unknown');
      setFacilities({
        isPetFriendly: place.isPetFriendly,
        isChildFriendly: place.isChildFriendly,
        isCarAccessible: place.isCarAccessible,
        isCampAllowed: place.isCampAllowed,
        isPicnicSuitable: place.isPicnicSuitable,
      });
      setSafetyNote(place.safetyNote ?? '');
      setExistingImage(place.image);
      setLoading(false);
    };

    void loadPlace();

    return () => {
      mounted = false;
    };
  }, [placeId, user, profile?.id, authLoading]);

  const toggleFacility = (key: FacilityToggleKey) => {
    setFacilities((current) => ({ ...current, [key]: !current[key] }));
  };

  const handlePickPhoto = async () => {
    setError(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setSelectedPhoto({ uri: result.assets[0].uri });
  };

  const handleAdjustOnMap = () => {
    if (submitting) {
      return;
    }
    clearLocationPickerResult();
    navigation.navigate(MAP_ROUTES.PICK_LOCATION, {
      latitude,
      longitude,
      returnTo: MAP_ROUTES.EDIT_PLACE,
      placeId,
    });
  };

  const abortBecausePhotoFailed = (reason: string) => {
    devError('[Nice Place] update photo upload failed:', reason);
    devError('[Nice Place] update request aborted because photo upload failed');
    setSubmitting(false);
    setSuccessVisible(false);
    setPhotoErrorVisible(true);
  };

  const handleSubmit = async () => {
    setError(null);
    setPhotoErrorVisible(false);
    setSuccessVisible(false);

    if (authLoading) {
      return;
    }

    if (!requireAuth(user, 'edit_place') || !user) {
      setAuthPromptVisible(true);
      return;
    }

    if (!title.trim()) {
      setError('Place name is required.');
      return;
    }

    if (!category) {
      setError('Please select a category.');
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);

    let profileId = profile?.id ?? null;
    if (!profileId) {
      const resolved = await resolveCurrentUserProfileId();
      profileId = resolved.profileId;
      if (!profileId) {
        setSubmitting(false);
        setError(
          resolved.error ??
            'Your account is signed in, but your profile could not be loaded. Try signing out and back in.',
        );
        return;
      }
    }

    // Default: keep existing cover when no new photo is selected.
    let coverPhotoUrl: string | null = existingImage;

    // Photo-first path: never insert place_update_requests if upload fails.
    if (selectedPhoto) {
      if (!profileId) {
        abortBecausePhotoFailed('Missing profile id');
        return;
      }

      const photoResult = await uploadPlaceCoverPhoto({
        placeId,
        imageUri: selectedPhoto.uri,
        authUserId: user.id,
        profileId,
        requirePlacePhotoRow: false,
      });

      if (!photoResult.success || !photoResult.imageUrl) {
        abortBecausePhotoFailed(photoResult.error ?? 'Unknown upload error');
        return;
      }

      coverPhotoUrl = photoResult.imageUrl;
    }

    // Only reached when there is no new photo, or photo upload succeeded.
    const result = await updateMyPlace(placeId, {
      title,
      description,
      category,
      latitude,
      longitude,
      bestTime,
      accessType,
      difficultyLevel,
      crowdLevel,
      isPetFriendly: facilities.isPetFriendly,
      isChildFriendly: facilities.isChildFriendly,
      isCarAccessible: facilities.isCarAccessible,
      isCampAllowed: facilities.isCampAllowed,
      isPicnicSuitable: facilities.isPicnicSuitable,
      safetyNote,
      coverPhotoUrl,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'Could not submit your update for review.');
      return;
    }

    setSuccessMessage(
      result.action === 'resubmit'
        ? 'Your place was sent back for review.'
        : 'Your changes were submitted for review.',
    );
    setSuccessVisible(true);
  };

  const handleSuccessDone = () => {
    setSuccessVisible(false);
    navigation.goBack();
  };

  const handlePhotoErrorRetry = () => {
    setPhotoErrorVisible(false);
    void handleSubmit();
  };

  const handlePhotoErrorCancel = () => {
    setPhotoErrorVisible(false);
  };

  if (authLoading || loading) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading place…</Text>
      </ScreenContainer>
    );
  }

  if (blockedMessage) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.content}>
        <EmptyState
          icon="lock-closed-outline"
          title="Cannot update this place"
          description={blockedMessage}
          action={
            <AppButton title="Go back" onPress={() => navigation.goBack()} fullWidth={false} />
          }
        />
      </ScreenContainer>
    );
  }

  const previewImage = selectedPhoto?.uri ?? existingImage;

  return (
    <>
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
      <SectionHeader
        title={placeStatus === 'rejected' ? 'Resubmit place' : 'Edit place'}
        subtitle={
          placeStatus === 'rejected'
            ? 'Update details and send this place back for review.'
            : 'Update details for a place you shared.'
        }
      />

      <FormSection icon="create-outline" title="Basic Info">
        <AppTextInput label="Place name *" placeholder="e.g. Sunset Cliff" value={title} onChangeText={setTitle} />
        <FieldLabel label="Category *" />
        <OptionGrid>
          {ADD_PLACE_CATEGORIES.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={category === item.value}
              onPress={() => setCategory(item.value)}
            />
          ))}
        </OptionGrid>
        <AppTextInput
          label="Description"
          placeholder="Why is this place worth visiting?"
          multiline
          numberOfLines={4}
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
        />
      </FormSection>

      <FormSection icon="location-outline" title="Location">
        <View
          style={[
            styles.locationBox,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.locationLabel, { color: colors.textPrimary }]}>{locationLabel}</Text>
          <Text style={[styles.coordsText, { color: colors.textSecondary }]}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>
        <AppButton title="Adjust on map" variant="secondary" onPress={handleAdjustOnMap} fullWidth={false} />
      </FormSection>

      <FormSection icon="time-outline" title="Visit Details">
        <FieldLabel label="Best time to visit" />
        <OptionGrid>
          {BEST_TIME_OPTIONS.map((option) => (
            <FilterChip key={option} label={option} active={bestTime === option} onPress={() => setBestTime(option)} />
          ))}
        </OptionGrid>
        <FieldLabel label="Access type" />
        <OptionGrid>
          {ACCESS_TYPE_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={accessType === option.value}
              onPress={() => setAccessType(option.value)}
            />
          ))}
        </OptionGrid>
        <FieldLabel label="Difficulty" />
        <OptionGrid>
          {DIFFICULTY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={difficultyLevel === option.value}
              onPress={() => setDifficultyLevel(option.value)}
            />
          ))}
        </OptionGrid>
        <FieldLabel label="Crowd level" />
        <OptionGrid>
          {CROWD_LEVEL_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={crowdLevel === option.value}
              onPress={() => setCrowdLevel(option.value)}
            />
          ))}
        </OptionGrid>
      </FormSection>

      <FormSection icon="leaf-outline" title="Facilities">
        <OptionGrid>
          {FACILITY_TOGGLES.map((item) => (
            <ToggleChip
              key={item.key}
              label={item.label}
              active={facilities[item.key]}
              onPress={() => toggleFacility(item.key)}
            />
          ))}
        </OptionGrid>
      </FormSection>

      <FormSection icon="shield-checkmark-outline" title="Safety">
        <AppTextInput
          label="Safety note (optional)"
          placeholder="Any hazards, access warnings, or things to watch for?"
          multiline
          numberOfLines={3}
          style={styles.safetyArea}
          value={safetyNote}
          onChangeText={setSafetyNote}
        />
      </FormSection>

      <FormSection icon="images-outline" title="Photos">
        {previewImage ? (
          <View style={styles.photoPreviewWrap}>
            <Image
              source={{ uri: previewImage }}
              style={[styles.photoPreview, { backgroundColor: colors.surfaceSecondary }]}
              resizeMode="cover"
            />
            <View style={styles.photoActions}>
              <AppButton title="Change photo" variant="secondary" onPress={handlePickPhoto} fullWidth={false} />
              {selectedPhoto ? (
                <AppButton title="Revert" variant="ghost" onPress={() => setSelectedPhoto(null)} fullWidth={false} />
              ) : null}
            </View>
          </View>
        ) : (
          <Pressable
            style={[
              styles.photoPicker,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            onPress={handlePickPhoto}
          >
            <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.photoPickerText, { color: colors.textSecondary }]}>
              Add cover photo (optional)
            </Text>
          </Pressable>
        )}
      </FormSection>

      {error && !authLoading ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title={
            submitting
              ? 'Saving…'
              : placeStatus === 'rejected'
                ? 'Resubmit for review'
                : 'Save changes'
          }
          onPress={handleSubmit}
          disabled={submitting}
        />
        <AppButton title="Cancel" variant="secondary" onPress={() => navigation.goBack()} disabled={submitting} />
      </View>
    </ScreenContainer>

    <FeedbackModal
      visible={successVisible}
      variant="success"
      title={placeStatus === 'rejected' ? 'Resubmitted' : 'Update request sent'}
      subtitle={successMessage}
      primaryLabel="Done"
      onPrimary={handleSuccessDone}
    />

    <FeedbackModal
      visible={photoErrorVisible}
      variant="error"
      title="Photo upload failed"
      subtitle="Please try again before submitting your update."
      primaryLabel="Try again"
      onPrimary={handlePhotoErrorRetry}
      secondaryLabel="Cancel"
      onSecondary={handlePhotoErrorCancel}
    />

    <AuthRequiredModal
      visible={authPromptVisible}
      message="Sign in to edit places you have shared."
      onSignIn={() => {
        setAuthPromptVisible(false);
        navigateToAuth(navigation);
      }}
      onCancel={() => {
        setAuthPromptVisible(false);
        navigation.goBack();
      }}
    />
    </>
  );
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <AppCard elevated={title === 'Basic Info'} style={styles.sectionCard}>
      <View style={styles.sectionHeading}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </AppCard>
  );
}

function FieldLabel({ label }: { label: string }) {
  const colors = useThemeColors();
  return <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>;
}

function OptionGrid({ children }: { children: ReactNode }) {
  return <View style={styles.optionGrid}>{children}</View>;
}

function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleChip,
        {
          backgroundColor: active ? colors.chipActiveBackground : colors.chipBackground,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={active ? colors.primary : colors.textMuted}
      />
      <Text
        style={[
          styles.toggleLabel,
          { color: active ? colors.primary : colors.textSecondary },
          active && styles.toggleLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
  },
  sectionBody: {
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: -spacing.xs,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  safetyArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationBox: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  locationLabel: {
    ...typography.label,
  },
  coordsText: {
    ...typography.caption,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  toggleLabel: {
    ...typography.caption,
  },
  toggleLabelActive: {
    fontWeight: '600',
  },
  photoPicker: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  photoPreviewWrap: {
    gap: spacing.sm,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoPickerText: {
    ...typography.label,
  },
  error: {
    ...typography.bodySmall,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
