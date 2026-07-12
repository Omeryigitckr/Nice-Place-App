import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  clearLocationPickerResult,
  consumeLocationPickerResult,
} from '../navigation/locationPickerResult';
import { devError } from '../utils/devLog';
import { localizePlaceFormMessage } from '../utils/placeFormMessages';

import {
  AppButton,
  AppCard,
  AppTextInput,
  EmptyState,
  FilterChip,
  PlacePhotoPickerForm,
  createPlacePhotoPickerItem,
  PlaceCategoryPicker,
  ScreenContainer,
  SectionHeader,
} from '../components';
import type { PlacePhotoPickerItem } from '../components';
import { AuthRequiredModal } from '../components/AuthRequiredModal';
import { FeedbackModal } from '../components/FeedbackModal';
import {
  ACCESS_TYPE_OPTIONS,
  BEST_TIME_OPTIONS,
  CROWD_LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  FACILITY_TOGGLES,
  MAP_ROUTES,
  getAccessTypeLabel,
  getBestTimeLabel,
  getCrowdLevelLabel,
  getDifficultyLabel,
  getFacilityLabel,
} from '../constants';
import type { BestTimeOption, FacilityToggleKey } from '../constants';
import {
  MAX_PLACE_CATEGORIES,
  MIN_PLACE_CATEGORIES,
  PlaceCategoryKey,
  normalizePlaceCategories,
} from '../constants/placeCategories';
import { useAuth } from '../hooks';
import {
  getMyPlaceById,
  MAX_PLACE_PHOTOS,
  MIN_PLACE_PHOTOS,
  normalizePlacePhotoUrls,
  resolveCurrentUserProfileId,
  updateMyPlace,
  uploadPlacePhotos,
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

function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function EditPlaceScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const { user, profile, loading: authLoading } = useAuth();
  const placeId = route.params.placeId;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<PlaceCategoryKey[]>([]);
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [locationLabel, setLocationLabel] = useState(t('placeForm.location.loading'));
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
  const [selectedPhotos, setSelectedPhotos] = useState<PlacePhotoPickerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [placeStatus, setPlaceStatus] = useState<'approved' | 'rejected' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState(() => t('editPlace.successBody'));
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
      setLocationLabel(address || t('placeForm.location.adjusted'));
      navigation.setParams({
        latitude: undefined,
        longitude: undefined,
        locationAdjusted: undefined,
      });
    }, [navigation, t]),
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
            setError(resolved.error ?? 'placeForm.errors.profileMissing');
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
        setError('placeForm.errors.notFound');
        setLoading(false);
        return;
      }

      if (place.status === 'pending') {
        setBlockedMessage(t('placeForm.errors.pendingCannotEdit'));
        setLoading(false);
        return;
      }

      if (place.status !== 'approved' && place.status !== 'rejected') {
        setBlockedMessage(t('placeForm.errors.cannotEdit'));
        setLoading(false);
        return;
      }

      setBlockedMessage(null);
      setPlaceStatus(place.status);
      setTitle(place.title);
      setSelectedCategories(normalizePlaceCategories(place.categories));
      setDescription(place.description);
      setLatitude(place.latitude);
      setLongitude(place.longitude);
      setLocationLabel(t('placeForm.location.current'));
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
      const initialPhotos = (place.photos?.length ? place.photos : place.image ? [place.image] : []).map(
        (uri) => createPlacePhotoPickerItem(uri),
      );
      setSelectedPhotos(initialPhotos);
      setLoading(false);
    };

    void loadPlace();

    return () => {
      mounted = false;
    };
  }, [placeId, user, profile?.id, authLoading, t]);

  const toggleFacility = (key: FacilityToggleKey) => {
    setFacilities((current) => ({ ...current, [key]: !current[key] }));
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
      setError(t('placeForm.validation.nameRequired'));
      return;
    }

    if (selectedCategories.length < MIN_PLACE_CATEGORIES) {
      setError(t('placeForm.validation.categoriesMin', { count: MIN_PLACE_CATEGORIES }));
      return;
    }

    if (selectedCategories.length > MAX_PLACE_CATEGORIES) {
      setError(t('placeForm.validation.categoriesMax', { count: MAX_PLACE_CATEGORIES }));
      return;
    }

    if (selectedPhotos.length < MIN_PLACE_PHOTOS) {
      setError(t('placeForm.validation.photosKeepMin', { count: MIN_PLACE_PHOTOS }));
      return;
    }

    if (selectedPhotos.length > MAX_PLACE_PHOTOS) {
      setError(t('placeForm.validation.photosMax', { count: MAX_PLACE_PHOTOS }));
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
        setError(resolved.error ?? 'placeForm.errors.profileMissing');
        return;
      }
    }

    let finalPhotoUrls: string[] = [];
    const localPhotos = selectedPhotos.filter((photo) => !isRemotePhotoUri(photo.uri));

    if (localPhotos.length > 0) {
      const uploadResult = await uploadPlacePhotos({
        placeId,
        imageUris: localPhotos.map((photo) => photo.uri),
        authUserId: user.id,
        profileId,
        requirePlacePhotoRow: false,
        insertPlacePhotoRows: placeStatus === 'rejected',
        updateCoverPhoto: placeStatus === 'rejected',
        status: 'pending',
      });

      if (!uploadResult.success || !uploadResult.imageUrls?.length) {
        abortBecausePhotoFailed(uploadResult.error ?? 'placeForm.errors.photoUploadFailed');
        return;
      }

      let uploadedIndex = 0;
      finalPhotoUrls = selectedPhotos.map((photo) => {
        if (isRemotePhotoUri(photo.uri)) {
          return photo.uri;
        }

        const uploaded = uploadResult.imageUrls?.[uploadedIndex];
        uploadedIndex += 1;
        return uploaded ?? photo.uri;
      });
    } else {
      finalPhotoUrls = selectedPhotos.map((photo) => photo.uri);
    }

    finalPhotoUrls = normalizePlacePhotoUrls(finalPhotoUrls);
    const coverPhotoUrl = finalPhotoUrls[0] ?? null;

    const result = await updateMyPlace(placeId, {
      title,
      description,
      categories: selectedCategories,
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
      photoUrls: finalPhotoUrls,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'placeForm.errors.updateFailed');
      return;
    }

    setSuccessMessage(
      result.action === 'resubmit'
        ? t('editPlace.successBodyResubmit')
        : t('editPlace.successBody'),
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('editPlace.loading')}
        </Text>
      </ScreenContainer>
    );
  }

  if (blockedMessage) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.content}>
        <EmptyState
          icon="lock-closed-outline"
          title={t('editPlace.blockedTitle')}
          description={blockedMessage}
          action={
            <AppButton
              title={t('common.back')}
              onPress={() => navigation.goBack()}
              fullWidth={false}
            />
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <>
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
      <SectionHeader
        title={placeStatus === 'rejected' ? t('editPlace.titleResubmit') : t('editPlace.title')}
        subtitle={
          placeStatus === 'rejected'
            ? t('editPlace.subtitleResubmit')
            : t('editPlace.subtitle')
        }
      />

      <FormSection icon="create-outline" title={t('placeForm.sections.basicInfo')} sectionKey="basicInfo">
        <AppTextInput
          label={t('placeForm.fields.placeName')}
          placeholder={t('placeForm.fields.placeNamePlaceholder')}
          value={title}
          onChangeText={setTitle}
        />
        <FieldLabel label={t('placeForm.fields.categories')} />
        <PlaceCategoryPicker
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
        <AppTextInput
          label={t('placeForm.fields.description')}
          placeholder={t('placeForm.fields.descriptionPlaceholder')}
          multiline
          numberOfLines={4}
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
        />
      </FormSection>

      <FormSection icon="location-outline" title={t('placeForm.sections.location')} sectionKey="location">
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
        <AppButton
          title={t('placeForm.location.adjustOnMap')}
          variant="secondary"
          onPress={handleAdjustOnMap}
          fullWidth={false}
        />
      </FormSection>

      <FormSection icon="time-outline" title={t('placeForm.sections.visitDetails')} sectionKey="visitDetails">
        <FieldLabel label={t('placeForm.fields.bestTime')} />
        <OptionGrid key={i18n.language}>
          {BEST_TIME_OPTIONS.map((option) => (
            <FilterChip
              key={option}
              label={getBestTimeLabel(option)}
              active={bestTime === option}
              onPress={() => setBestTime(option)}
            />
          ))}
        </OptionGrid>
        <FieldLabel label={t('placeForm.fields.accessType')} />
        <OptionGrid>
          {ACCESS_TYPE_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={getAccessTypeLabel(option.value)}
              active={accessType === option.value}
              onPress={() => setAccessType(option.value)}
            />
          ))}
        </OptionGrid>
        <FieldLabel label={t('placeForm.fields.difficulty')} />
        <OptionGrid>
          {DIFFICULTY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={getDifficultyLabel(option.value)}
              active={difficultyLevel === option.value}
              onPress={() => setDifficultyLevel(option.value)}
            />
          ))}
        </OptionGrid>
        <FieldLabel label={t('placeForm.fields.crowdLevel')} />
        <OptionGrid>
          {CROWD_LEVEL_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={getCrowdLevelLabel(option.value)}
              active={crowdLevel === option.value}
              onPress={() => setCrowdLevel(option.value)}
            />
          ))}
        </OptionGrid>
      </FormSection>

      <FormSection icon="leaf-outline" title={t('placeForm.sections.facilities')} sectionKey="facilities">
        <OptionGrid>
          {FACILITY_TOGGLES.map((item) => (
            <ToggleChip
              key={item.key}
              label={getFacilityLabel(item.key)}
              active={facilities[item.key]}
              onPress={() => toggleFacility(item.key)}
            />
          ))}
        </OptionGrid>
      </FormSection>

      <FormSection icon="shield-checkmark-outline" title={t('placeForm.sections.safety')} sectionKey="safety">
        <AppTextInput
          label={t('placeForm.fields.safetyNote')}
          placeholder={t('placeForm.fields.safetyNotePlaceholder')}
          multiline
          numberOfLines={3}
          style={styles.safetyArea}
          value={safetyNote}
          onChangeText={setSafetyNote}
        />
      </FormSection>

      <FormSection icon="images-outline" title={t('placeForm.sections.photos')} sectionKey="photos">
        <PlacePhotoPickerForm
          photos={selectedPhotos}
          onChange={setSelectedPhotos}
          required
        />
      </FormSection>

      {error && !authLoading ? (
        <Text style={[styles.error, { color: colors.error }]}>
          {localizePlaceFormMessage(error)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title={
            submitting
              ? t('editPlace.saving')
              : placeStatus === 'rejected'
                ? t('editPlace.resubmit')
                : t('editPlace.save')
          }
          onPress={handleSubmit}
          disabled={submitting}
        />
        <AppButton
          title={t('common.cancel')}
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={submitting}
        />
      </View>
    </ScreenContainer>

    <FeedbackModal
      visible={successVisible}
      variant="success"
      title={
        placeStatus === 'rejected'
          ? t('editPlace.successTitleResubmit')
          : t('editPlace.successTitle')
      }
      subtitle={successMessage}
      primaryLabel={t('common.done')}
      onPrimary={handleSuccessDone}
    />

    <FeedbackModal
      visible={photoErrorVisible}
      variant="error"
      title={t('editPlace.photoErrorTitle')}
      subtitle={t('editPlace.photoErrorBody')}
      primaryLabel={t('common.retry')}
      onPrimary={handlePhotoErrorRetry}
      secondaryLabel={t('common.cancel')}
      onSecondary={handlePhotoErrorCancel}
    />

    <AuthRequiredModal
      visible={authPromptVisible}
      message={t('editPlace.authMessage')}
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
  sectionKey,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sectionKey?: string;
  children: ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <AppCard elevated={sectionKey === 'basicInfo'} style={styles.sectionCard}>
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
