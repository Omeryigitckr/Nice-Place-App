import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AppButton,
  AppCard,
  AppTextInput,
  AuthErrorMessage,
  FilterChip,
  ProfileEntranceBlock,
  ScreenContainer,
  SectionHeader,
} from '../components';
import { AuthRequiredModal } from '../components/AuthRequiredModal';
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
  clearAddPlaceFormDraft,
  consumeAddPlaceFormDraft,
  peekAddPlaceFormDraft,
  saveAddPlaceFormDraft,
} from '../navigation/addPlaceFormDraft';
import {
  clearLocationPickerResult,
  consumeLocationPickerResult,
} from '../navigation/locationPickerResult';
import { createPlace, resolveCurrentUserProfileId, uploadPlaceCoverPhoto } from '../services';
import { hapticError, hapticSuccess, showAppToast } from '../feedback';
import { radius, spacing, typography } from '../theme';
import { motion, motionEasing } from '../theme/motion';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';
import { AddPlaceStackParamList } from '../types';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { devLog } from '../utils/devLog';
import { DEFAULT_MAP_CENTER } from '../utils/mapbox';

type Props = NativeStackScreenProps<AddPlaceStackParamList, typeof MAP_ROUTES.ADD_PLACE>;

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

const INITIAL_FACILITIES: FacilityState = {
  isPetFriendly: false,
  isChildFriendly: false,
  isCarAccessible: false,
  isCampAllowed: false,
  isPicnicSuitable: false,
};

export function AddPlaceScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { user, profile, loading: authLoading } = useAuth();
  // Rehydrate from draft if the screen remounted while the map picker was open.
  const bootDraft = peekAddPlaceFormDraft();
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [title, setTitle] = useState(bootDraft?.title ?? '');
  const [category, setCategory] = useState<AddPlaceCategoryValue | null>(
    bootDraft?.category ?? null,
  );
  const [description, setDescription] = useState(bootDraft?.description ?? '');
  const [latitude, setLatitude] = useState(
    bootDraft?.latitude ?? DEFAULT_MAP_CENTER[1],
  );
  const [longitude, setLongitude] = useState(
    bootDraft?.longitude ?? DEFAULT_MAP_CENTER[0],
  );
  const [locationReady, setLocationReady] = useState(bootDraft?.locationReady ?? false);
  const [locationLabel, setLocationLabel] = useState(
    bootDraft?.locationLabel ?? 'Waiting for location…',
  );
  const [bestTime, setBestTime] = useState<BestTimeOption>(bootDraft?.bestTime ?? 'Anytime');
  const [accessType, setAccessType] = useState<DbAccessType>(
    bootDraft?.accessType ?? 'unknown',
  );
  const [difficultyLevel, setDifficultyLevel] = useState<DbDifficultyLevel>(
    bootDraft?.difficultyLevel ?? 'unknown',
  );
  const [crowdLevel, setCrowdLevel] = useState<DbCrowdLevel>(
    bootDraft?.crowdLevel ?? 'unknown',
  );
  const [facilities, setFacilities] = useState<FacilityState>(
    bootDraft?.facilities ?? INITIAL_FACILITIES,
  );
  const [safetyNote, setSafetyNote] = useState(bootDraft?.safetyNote ?? '');
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(
    bootDraft?.selectedPhotoUri ? { uri: bootDraft.selectedPhotoUri } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        ...typography.screenTitle,
        fontSize: 17,
        color: colors.textPrimary,
      },
      contentStyle: { backgroundColor: colors.background },
    });
  }, [navigation, colors.background, colors.textPrimary]);

  // Rehydrate from draft if the screen remounted while the map picker was open.
  const userPickedLocationRef = useRef(bootDraft?.userPickedLocation ?? false);
  const gpsRequestIdRef = useRef(0);
  const didInitialGpsRef = useRef(Boolean(bootDraft));
  // Snapshot for dev logs (avoid stale closures in focus effect).
  const formSnapshotRef = useRef({
    title: '',
    description: '',
    category: null as AddPlaceCategoryValue | null,
    hasPhoto: false,
    bestTime: 'Anytime' as BestTimeOption,
    accessType: 'unknown' as DbAccessType,
    difficultyLevel: 'unknown' as DbDifficultyLevel,
    crowdLevel: 'unknown' as DbCrowdLevel,
    facilities: INITIAL_FACILITIES,
    safetyNote: '',
    latitude: DEFAULT_MAP_CENTER[1],
    longitude: DEFAULT_MAP_CENTER[0],
  });

  formSnapshotRef.current = {
    title,
    description,
    category,
    hasPhoto: selectedPhoto != null,
    bestTime,
    accessType,
    difficultyLevel,
    crowdLevel,
    facilities,
    safetyNote,
    latitude,
    longitude,
  };

  const loadGpsLocation = useCallback(async () => {
    if (userPickedLocationRef.current) {
      return;
    }

    const requestId = ++gpsRequestIdRef.current;
    setLocationReady(false);
    setLocationLabel('Waiting for location…');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (requestId !== gpsRequestIdRef.current || userPickedLocationRef.current) {
        return;
      }

      if (status !== 'granted') {
        setLocationLabel('Using default map area — tap Set on Map to refine');
        setLocationReady(true);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (requestId !== gpsRequestIdRef.current || userPickedLocationRef.current) {
        return;
      }

      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setLocationLabel('Using your current location');
      setLocationReady(true);
    } catch {
      if (requestId !== gpsRequestIdRef.current || userPickedLocationRef.current) {
        return;
      }
      setLocationLabel('Using default map area — tap Set on Map to refine');
      setLocationReady(true);
    }
  }, []);

  // GPS once on first mount only — skip when returning from the map picker (draft exists).
  useEffect(() => {
    if (didInitialGpsRef.current) {
      return;
    }
    const pendingDraft = peekAddPlaceFormDraft();
    if (pendingDraft?.awaitingPicker) {
      didInitialGpsRef.current = true;
      return;
    }
    didInitialGpsRef.current = true;
    void loadGpsLocation();
  }, [loadGpsLocation]);

  // After map picker: restore full draft (survives unmount), then merge location only.
  useFocusEffect(
    useCallback(() => {
      const draft = consumeAddPlaceFormDraft();
      const locationResult = consumeLocationPickerResult();

      if (!draft && !locationResult) {
        devLog('[Nice Place AddPlace] focus, no draft/location', {
          form: formSnapshotRef.current,
        });
        return;
      }

      // Invalidate GPS so it cannot overwrite restored / picked coords.
      gpsRequestIdRef.current += 1;
      didInitialGpsRef.current = true;

      if (draft) {
        devLog('[Nice Place AddPlace] restoring form draft', {
          title: draft.title,
          category: draft.category,
          hasPhoto: Boolean(draft.selectedPhotoUri),
          awaitingPicker: draft.awaitingPicker,
        });
        setTitle(draft.title);
        setCategory(draft.category);
        setDescription(draft.description);
        setBestTime(draft.bestTime);
        setAccessType(draft.accessType);
        setDifficultyLevel(draft.difficultyLevel);
        setCrowdLevel(draft.crowdLevel);
        setFacilities({ ...draft.facilities });
        setSafetyNote(draft.safetyNote);
        setSelectedPhoto(
          draft.selectedPhotoUri ? { uri: draft.selectedPhotoUri } : null,
        );
        setError(null);

        if (locationResult) {
          userPickedLocationRef.current = true;
          setLatitude(locationResult.latitude);
          setLongitude(locationResult.longitude);
          setLocationReady(true);
          const address = locationResult.addressText?.trim();
          setLocationLabel(address || 'Location adjusted on map');
          devLog('[Nice Place AddPlace] location merged into draft', locationResult);
        } else {
          // Cancel: restore previous location fields exactly.
          userPickedLocationRef.current = draft.userPickedLocation;
          setLatitude(draft.latitude);
          setLongitude(draft.longitude);
          setLocationReady(draft.locationReady);
          setLocationLabel(draft.locationLabel);
          devLog('[Nice Place AddPlace] picker canceled, draft restored');
        }
      } else if (locationResult) {
        // Screen stayed mounted — only update location fields.
        userPickedLocationRef.current = true;
        setLatitude(locationResult.latitude);
        setLongitude(locationResult.longitude);
        setLocationReady(true);
        const address = locationResult.addressText?.trim();
        setLocationLabel(address || 'Location adjusted on map');
        devLog('[Nice Place AddPlace] location applied (mounted)', locationResult);
        devLog('[Nice Place AddPlace] form after location', formSnapshotRef.current);
      }

      navigation.setParams({
        latitude: undefined,
        longitude: undefined,
        locationAdjusted: undefined,
      });
    }, [navigation]),
  );

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

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
  };

  const handleAdjustOnMap = () => {
    if (submitting) {
      return;
    }

    const draft = {
      awaitingPicker: true,
      title,
      category,
      description,
      latitude,
      longitude,
      locationReady,
      locationLabel,
      userPickedLocation: userPickedLocationRef.current,
      bestTime,
      accessType,
      difficultyLevel,
      crowdLevel,
      facilities: { ...facilities },
      safetyNote,
      selectedPhotoUri: selectedPhoto?.uri ?? null,
    };

    devLog('[Nice Place AddPlace] opening location picker (saving draft)', draft);
    saveAddPlaceFormDraft(draft);
    clearLocationPickerResult();
    navigation.navigate(MAP_ROUTES.PICK_LOCATION, {
      latitude,
      longitude,
      returnTo: MAP_ROUTES.ADD_PLACE,
    });
  };

  const resetFormAfterSubmit = useCallback(() => {
    clearLocationPickerResult();
    clearAddPlaceFormDraft();
    userPickedLocationRef.current = false;
    gpsRequestIdRef.current += 1;

    setTitle('');
    setCategory(null);
    setDescription('');
    setLatitude(DEFAULT_MAP_CENTER[1]);
    setLongitude(DEFAULT_MAP_CENTER[0]);
    setLocationReady(false);
    setLocationLabel('Waiting for location…');
    setBestTime('Anytime');
    setAccessType('unknown');
    setDifficultyLevel('unknown');
    setCrowdLevel('unknown');
    setFacilities(INITIAL_FACILITIES);
    setSafetyNote('');
    setSelectedPhoto(null);
    setError(null);

    navigation.setParams({
      latitude: undefined,
      longitude: undefined,
      locationAdjusted: undefined,
    });

    void loadGpsLocation();
    devLog('[Nice Place AddPlace] form reset after submit');
  }, [loadGpsLocation, navigation]);

  const finishSubmission = (message: string, photoWarning?: string) => {
    const body = photoWarning ? `${message} ${photoWarning}` : message;
    resetFormAfterSubmit();
    setSubmitting(false);
    hapticSuccess();
    showAppToast(body, {
      tone: photoWarning ? 'info' : 'success',
      icon: 'checkmark-circle-outline',
    });
    // Stay on a clean Add Place form — do not leave stale picker/route state.
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    setError(null);

    if (authLoading) {
      return;
    }

    if (!requireAuth(user, 'add_place') || !user) {
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

    if (!locationReady || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Location is required. Set on Map or enable location permission.');
      return;
    }

    setSubmitting(true);

    const result = await createPlace({
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
    });

    if (!result.success || !result.placeId) {
      setSubmitting(false);
      const message = result.error ?? 'Could not submit place.';
      setError(message);
      hapticError();
      showAppToast(message, { tone: 'error' });
      return;
    }

    if (selectedPhoto) {
      const profileId = profile?.id ?? (await resolveCurrentUserProfileId()).profileId;

      if (!profileId) {
        finishSubmission(
          'Your place was saved and will appear on the map after review.',
          'Photo upload failed.',
        );
        return;
      }

      const photoResult = await uploadPlaceCoverPhoto({
        placeId: result.placeId,
        imageUri: selectedPhoto.uri,
        authUserId: user.id,
        profileId,
      });

      if (!photoResult.success) {
        finishSubmission(
          'Your place was saved and will appear on the map after review.',
          'Place submitted, but photo upload failed.',
        );
        return;
      }

      finishSubmission('Your place was saved and will appear on the map after review.');
      return;
    }

    finishSubmission('Your place was saved and will appear on the map after review.');
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.sm : 0}
    >
    <ScreenContainer
      scrollable
      safeTop={false}
      reserveFloatingTabBar
      keyboardAware
      contentStyle={styles.content}
    >
      <ProfileEntranceBlock index={0}>
        <SectionHeader
          title="Share a place"
          subtitle="Help others discover a hidden spot worth visiting."
        />
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={1}>
      <FormSection icon="create-outline" title="Basic Info">
        <AppTextInput
          label="Place name *"
          placeholder="e.g. Sunset Cliff"
          value={title}
          onChangeText={setTitle}
        />
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
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={2}>
      <FormSection icon="location-outline" title="Location">
        <LocationFeedbackBox
          locationLabel={locationLabel}
          latitude={latitude}
          longitude={longitude}
          ready={locationReady}
        />
        <AppButton
          title="Set on Map"
          variant="secondary"
          onPress={handleAdjustOnMap}
          disabled={submitting}
          fullWidth={false}
        />
      </FormSection>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={3}>
      <FormSection icon="time-outline" title="Visit Details">
        <FieldLabel label="Best time to visit" />
        <OptionGrid>
          {BEST_TIME_OPTIONS.map((option) => (
            <FilterChip
              key={option}
              label={option}
              active={bestTime === option}
              onPress={() => setBestTime(option)}
            />
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
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={4}>
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
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={5}>
      <FormSection icon="images-outline" title="Photos">
        <PhotoPickerBlock
          selectedPhoto={selectedPhoto}
          onPick={handlePickPhoto}
          onRemove={handleRemovePhoto}
        />
      </FormSection>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={6}>
        <AuthErrorMessage message={error} />

        <View style={styles.actions}>
          <AppButton
            title={submitting ? 'Submitting…' : 'Submit Place'}
            onPress={handleSubmit}
            disabled={submitting}
            loading={submitting}
          />
          <AppButton
            title="Cancel"
            variant="secondary"
            onPress={() => navigation.goBack()}
            disabled={submitting}
          />
        </View>
      </ProfileEntranceBlock>
    </ScreenContainer>
    </KeyboardAvoidingView>

    <AuthRequiredModal
      visible={authPromptVisible}
      message="Sign in to share a new place with the community."
      onSignIn={() => {
        setAuthPromptVisible(false);
        navigateToAuth(navigation);
      }}
      onCancel={() => setAuthPromptVisible(false)}
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
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: motion.duration.normal,
      easing: motionEasing.out,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.chipBackground, colors.chipActiveBackground],
  });

  const borderColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animatePress(motion.scale.press)}
        onPressOut={() => animatePress(1)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Animated.View style={[styles.toggleChip, { backgroundColor, borderColor }]}>
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
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function LocationFeedbackBox({
  locationLabel,
  latitude,
  longitude,
  ready,
}: {
  locationLabel: string;
  latitude: number;
  longitude: number;
  ready: boolean;
}) {
  const colors = useThemeColors();
  const pulse = useRef(new Animated.Value(ready ? 1 : 0.7)).current;

  useEffect(() => {
    if (!ready) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: motionEasing.out,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.7,
            duration: 700,
            easing: motionEasing.out,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    Animated.timing(pulse, {
      toValue: 1,
      duration: motion.duration.normal,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  }, [pulse, ready]);

  return (
    <Animated.View
      style={[
        styles.locationBox,
        {
          backgroundColor: colors.input,
          borderColor: ready ? colors.primaryBorder : colors.border,
          opacity: pulse,
        },
      ]}
    >
      <Text style={[styles.locationLabel, { color: colors.textPrimary }]}>{locationLabel}</Text>
      <Text style={[styles.coordsText, { color: colors.textSecondary }]}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </Animated.View>
  );
}

function PhotoPickerBlock({
  selectedPhoto,
  onPick,
  onRemove,
}: {
  selectedPhoto: SelectedPhoto | null;
  onPick: () => void;
  onRemove: () => void;
}) {
  const colors = useThemeColors();
  const pressScale = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!selectedPhoto) {
      imageOpacity.setValue(0);
      return;
    }

    imageOpacity.setValue(0);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: motion.duration.slow,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  }, [imageOpacity, selectedPhoto]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  if (selectedPhoto) {
    return (
      <View style={styles.photoPreviewWrap}>
        <View style={[styles.photoPreview, { backgroundColor: colors.surfaceSecondary }]}>
          <Animated.Image
            source={{ uri: selectedPhoto.uri }}
            style={[styles.photoPreviewImage, { opacity: imageOpacity }]}
            resizeMode="cover"
          />
        </View>
        <View style={styles.photoActions}>
          <AppButton title="Change photo" variant="secondary" onPress={onPick} fullWidth={false} />
          <AppButton title="Remove" variant="ghost" onPress={onRemove} fullWidth={false} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        style={[
          styles.photoPicker,
          { backgroundColor: colors.input, borderColor: colors.border },
        ]}
        accessibilityRole="button"
        onPress={onPick}
        onPressIn={() => animatePress(motion.scale.press)}
        onPressOut={() => animatePress(1)}
      >
        <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
        <Text style={[styles.photoPickerText, { color: colors.textSecondary }]}>
          Add cover photo (optional)
        </Text>
        <Text style={[styles.photoPickerSubtext, { color: colors.textMuted }]}>
          Choose from your gallery
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
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
    overflow: 'hidden',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoPickerText: {
    ...typography.label,
  },
  photoPickerSubtext: {
    ...typography.caption,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
