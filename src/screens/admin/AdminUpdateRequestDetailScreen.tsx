import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppTextInput, CachedImage, EmptyState, PlaceCategoryChips, ScreenContainer } from '../../components';
import { FeedbackModal } from '../../components/FeedbackModal';
import { PROFILE_ROUTES } from '../../constants';
import {
  getAccessTypeLabel,
  getBestTimeLabel,
  getCrowdLevelLabel,
  getDifficultyLabel,
} from '../../constants/addPlaceOptions';
import {
  categoryKeyListsEqual,
  formatCategoryDisplayLabels,
  normalizePlaceCategories,
} from '../../constants/placeCategories';
import { useAdminAccess } from '../../hooks';
import {
  approvePlaceUpdateRequest,
  fetchPlaceCategoriesByPlaceIds,
  getPlaceForAdminReview,
  getPlacePhotoUrls,
  getPlaceUpdateRequestById,
  normalizePlacePhotoUrls,
  rejectPlaceUpdateRequest,
  restoreRejectedPlaceUpdateRequest,
} from '../../services';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { DbPlace, DbPlaceUpdateRequest } from '../../types/database';
import { ProfileStackParamList } from '../../types';
import {
  getPlaceStatusLabel,
  isAdminAccessGateMessage,
  localizeAdminMessage,
} from '../../utils/adminMessages';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_UPDATE_REQUEST
>;

type TranslateFn = (key: string) => string;

type CompareField = {
  key: string;
  labelKey: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
};

function formatValue(value: unknown, t: TranslateFn, fieldKey?: string): string {
  if (value == null || value === '') {
    return t('admin.emDash');
  }
  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no');
  }
  const asString = String(value);
  if (fieldKey === 'best_time') {
    return getBestTimeLabel(asString);
  }
  if (fieldKey === 'access_type') {
    return getAccessTypeLabel(asString);
  }
  if (fieldKey === 'difficulty_level') {
    return getDifficultyLabel(asString);
  }
  if (fieldKey === 'crowd_level') {
    return getCrowdLevelLabel(asString);
  }
  return asString;
}

function buildComparisons(
  place: DbPlace,
  request: DbPlaceUpdateRequest,
  t: TranslateFn,
): CompareField[] {
  const fields: Array<{
    key: keyof DbPlaceUpdateRequest | string;
    labelKey: string;
    placeKey: keyof DbPlace;
  }> = [
    { key: 'title', labelKey: 'admin.fields.title', placeKey: 'title' },
    { key: 'description', labelKey: 'admin.fields.description', placeKey: 'description' },
    { key: 'latitude', labelKey: 'admin.fields.latitude', placeKey: 'latitude' },
    { key: 'longitude', labelKey: 'admin.fields.longitude', placeKey: 'longitude' },
    { key: 'access_type', labelKey: 'admin.fields.accessType', placeKey: 'access_type' },
    { key: 'best_time', labelKey: 'admin.fields.bestTime', placeKey: 'best_time' },
    { key: 'difficulty_level', labelKey: 'admin.fields.difficulty', placeKey: 'difficulty_level' },
    { key: 'crowd_level', labelKey: 'admin.fields.crowdLevel', placeKey: 'crowd_level' },
    { key: 'cover_photo_url', labelKey: 'admin.fields.coverPhotoUrl', placeKey: 'cover_photo_url' },
    { key: 'safety_note', labelKey: 'admin.fields.safetyNote', placeKey: 'safety_note' },
    { key: 'is_pet_friendly', labelKey: 'admin.flags.petFriendly', placeKey: 'is_pet_friendly' },
    {
      key: 'is_child_friendly',
      labelKey: 'admin.flags.childFriendly',
      placeKey: 'is_child_friendly',
    },
    {
      key: 'is_car_accessible',
      labelKey: 'admin.flags.carAccessible',
      placeKey: 'is_car_accessible',
    },
    { key: 'is_camp_allowed', labelKey: 'admin.flags.campAllowed', placeKey: 'is_camp_allowed' },
    {
      key: 'is_picnic_suitable',
      labelKey: 'admin.flags.picnicSuitable',
      placeKey: 'is_picnic_suitable',
    },
  ];

  return fields.map((field) => {
    const oldRaw = place[field.placeKey];
    const newRaw = request[field.key as keyof DbPlaceUpdateRequest];
    const oldValue = formatValue(oldRaw, t, String(field.key));
    const newValue = formatValue(newRaw, t, String(field.key));
    return {
      key: String(field.key),
      labelKey: field.labelKey,
      oldValue,
      newValue,
      changed: String(oldRaw ?? '') !== String(newRaw ?? '') && newRaw != null,
    };
  });
}

export function AdminUpdateRequestDetailScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();

  const [request, setRequest] = useState<DbPlaceUpdateRequest | null>(null);
  const [place, setPlace] = useState<DbPlace | null>(null);
  const [currentPhotoUrls, setCurrentPhotoUrls] = useState<string[]>([]);
  const [currentCategoryKeys, setCurrentCategoryKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'restore' | null>(
    null,
  );
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessageKey, setSuccessMessageKey] = useState('');

  const emDash = t('admin.emDash');

  const load = useCallback(async () => {
    if (adminLoading || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    const requestResult = await getPlaceUpdateRequestById(requestId);
    if (requestResult.error || !requestResult.request) {
      const message = requestResult.error ?? 'admin.errors.requestNotFound';
      if (!isAdminAccessGateMessage(message)) {
        setError(message);
      }
      setLoading(false);
      return;
    }

    const placeResult = await getPlaceForAdminReview(requestResult.request.place_id);
    if (placeResult.error || !placeResult.place) {
      const message = placeResult.error ?? 'admin.errors.placeNotFound';
      if (!isAdminAccessGateMessage(message)) {
        setError(message);
      }
      setLoading(false);
      return;
    }

    setRequest(requestResult.request);
    setPlace(placeResult.place);
    const currentPhotos = await getPlacePhotoUrls(
      placeResult.place.id,
      placeResult.place.cover_photo_url,
    );
    setCurrentPhotoUrls(currentPhotos);
    const categoryMap = await fetchPlaceCategoriesByPlaceIds([placeResult.place.id]);
    setCurrentCategoryKeys(
      categoryMap[placeResult.place.id] ??
        normalizePlaceCategories([placeResult.place.category ?? '']),
    );
    setAdminNote(requestResult.request.admin_note ?? '');
    setLoading(false);
  }, [adminLoading, isAdmin, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async () => {
    if (!request || !confirmAction || acting) {
      return;
    }

    const action = confirmAction;

    setActing(true);
    setError(null);

    const result =
      action === 'approve'
        ? await approvePlaceUpdateRequest(request.id, adminNote)
        : action === 'reject'
          ? await rejectPlaceUpdateRequest(request.id, adminNote)
          : await restoreRejectedPlaceUpdateRequest(request.id);

    setActing(false);
    setConfirmAction(null);

    if (!result.success) {
      setError(
        result.error ??
          (action === 'restore'
            ? 'admin.errors.actionFailed'
            : action === 'approve'
              ? 'admin.errors.approveUpdateFailed'
              : 'admin.errors.rejectUpdateFailed'),
      );
      return;
    }

    if (action === 'restore') {
      setRequest((current) =>
        current
          ? {
              ...current,
              status: 'pending',
              reviewed_at: null,
              reviewed_by: null,
              admin_note: null,
            }
          : current,
      );
      setAdminNote('');
      setSuccessMessageKey('admin.updateDetail.successRestore');
    } else {
      setRequest((current) =>
        current
          ? {
              ...current,
              status: action === 'approve' ? 'approved' : 'rejected',
              admin_note: adminNote.trim() || current.admin_note,
            }
          : current,
      );
      setSuccessMessageKey(
        action === 'approve'
          ? 'admin.updateDetail.successApprove'
          : 'admin.updateDetail.successReject',
      );
    }
    setSuccessVisible(true);
  };

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('admin.checkingAccess')}
        </Text>
      </ScreenContainer>
    );
  }

  if (!authUserId) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="person-outline"
          title={t('admin.access.signInTitle')}
          description={t('admin.access.signInBodyShort')}
        />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="lock-closed-outline"
          title={t('admin.access.deniedTitle')}
          description={t('admin.access.deniedBody')}
        />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('admin.updateDetail.loading')}
        </Text>
      </ScreenContainer>
    );
  }

  if (error && (!request || !place)) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('admin.updateDetail.loadFailedTitle')}
          description={localizeAdminMessage(error) ?? t('admin.updateDetail.notFoundBody')}
        />
      </ScreenContainer>
    );
  }

  if (!request || !place) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('admin.updateDetail.notFoundTitle')}
          description={t('admin.updateDetail.notFoundBody')}
        />
      </ScreenContainer>
    );
  }

  const comparisons = buildComparisons(place, request, (key) => String(t(key as never)));
  const requestedPhotoUrls = normalizePlacePhotoUrls(
    Array.isArray(request.photo_urls)
      ? request.photo_urls
      : request.cover_photo_url
        ? [request.cover_photo_url]
        : [],
  );
  const photosChanged =
    requestedPhotoUrls.length > 0 &&
    JSON.stringify(currentPhotoUrls) !== JSON.stringify(requestedPhotoUrls);

  const requestedCategoryKeys = Array.isArray(request.category_keys)
    ? normalizePlaceCategories(request.category_keys)
    : [];
  const categoriesChanged =
    requestedCategoryKeys.length > 0 &&
    !categoryKeyListsEqual(currentCategoryKeys, requestedCategoryKeys);

  return (
    <>
      <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('admin.updateDetail.categories')}
          </Text>
          <View style={styles.photoRow}>
            <View style={styles.photoCol}>
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>
                {t('admin.updateDetail.current')}
              </Text>
              <PlaceCategoryChips
                place={{
                  categories: currentCategoryKeys,
                  categorySlug: place.category ?? '',
                  category: place.category ?? '',
                }}
                maxVisible={8}
              />
            </View>
            <View style={styles.photoCol}>
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>
                {t('admin.updateDetail.requested')}
              </Text>
              {requestedCategoryKeys.length > 0 ? (
                <PlaceCategoryChips
                  place={{
                    categories: requestedCategoryKeys,
                    categorySlug: requestedCategoryKeys[0] ?? '',
                    category: formatCategoryDisplayLabels(requestedCategoryKeys)[0] ?? emDash,
                  }}
                  maxVisible={8}
                />
              ) : (
                <Text style={[styles.photoLabel, { color: colors.textMuted }]}>{emDash}</Text>
              )}
            </View>
          </View>
          {categoriesChanged ? (
            <Text style={[styles.photoChangeNote, { color: colors.primary }]}>
              {t('admin.updateDetail.categoriesChanged')}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('admin.updateDetail.photos')}
          </Text>
          <View style={styles.photoRow}>
            <View style={styles.photoCol}>
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>
                {t('admin.updateDetail.current')}
              </Text>
              {currentPhotoUrls.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                  {currentPhotoUrls.map((uri, index) => (
                    <CachedImage
                      key={`current-${uri}-${index}`}
                      uri={uri}
                      width={120}
                      height={90}
                      borderRadius={radius.md}
                      recyclingKey={`current-${uri}-${index}`}
                    />
                  ))}
                </ScrollView>
              ) : place.cover_photo_url ? (
                <Image
                  source={{ uri: place.cover_photo_url }}
                  style={[styles.photo, { backgroundColor: colors.surfaceSecondary }]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.photo,
                    styles.photoPlaceholder,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.photoCol}>
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>
                {t('admin.updateDetail.requested')}
              </Text>
              {requestedPhotoUrls.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                  {requestedPhotoUrls.map((uri, index) => (
                    <CachedImage
                      key={`requested-${uri}-${index}`}
                      uri={uri}
                      width={120}
                      height={90}
                      borderRadius={radius.md}
                      recyclingKey={`requested-${uri}-${index}`}
                    />
                  ))}
                </ScrollView>
              ) : request.cover_photo_url ? (
                <Image
                  source={{ uri: request.cover_photo_url }}
                  style={[styles.photo, { backgroundColor: colors.surfaceSecondary }]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.photo,
                    styles.photoPlaceholder,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                </View>
              )}
            </View>
          </View>
          {photosChanged ? (
            <Text style={[styles.photoChangeNote, { color: colors.primary }]}>
              {t('admin.updateDetail.photoSetChanged', {
                from: currentPhotoUrls.length,
                to: requestedPhotoUrls.length,
              })}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('admin.updateDetail.fieldComparison')}
          </Text>
          {comparisons.map((field) => (
            <View
              key={field.key}
              style={[
                styles.compareCard,
                {
                  backgroundColor: colors.card,
                  borderColor: field.changed ? colors.primary : colors.border,
                  ...shadows.sm,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t(field.labelKey as never)}
              </Text>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={[styles.compareHeading, { color: colors.textMuted }]}>
                    {t('admin.updateDetail.current')}
                  </Text>
                  <Text style={[styles.compareValue, { color: colors.textSecondary }]}>
                    {field.oldValue}
                  </Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={[styles.compareHeading, { color: colors.textMuted }]}>
                    {t('admin.updateDetail.requested')}
                  </Text>
                  <Text
                    style={[
                      styles.compareValue,
                      { color: field.changed ? colors.primary : colors.textSecondary },
                      field.changed && styles.compareValueChanged,
                    ]}
                  >
                    {field.newValue}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('admin.fields.adminNoteOptional')}
          </Text>
          <AppTextInput
            label={t('admin.fields.note')}
            placeholder={t('admin.updateDetail.notePlaceholder')}
            value={adminNote}
            onChangeText={setAdminNote}
            multiline
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {localizeAdminMessage(error)}
          </Text>
        ) : null}

        {request.status === 'pending' ? (
          <View style={styles.actions}>
            <AppButton
              title={t('admin.updateDetail.approve')}
              onPress={() => setConfirmAction('approve')}
              disabled={acting}
            />
            <AppButton
              title={t('admin.updateDetail.reject')}
              variant="secondary"
              onPress={() => setConfirmAction('reject')}
              disabled={acting}
            />
          </View>
        ) : request.status === 'rejected' ? (
          <View style={styles.actions}>
            <AppButton
              title={t('admin.updateDetail.restore')}
              onPress={() => setConfirmAction('restore')}
              disabled={acting}
            />
          </View>
        ) : (
          <Text style={[styles.statusNote, { color: colors.textSecondary }]}>
            {t('admin.updateDetail.alreadyStatus', {
              status: getPlaceStatusLabel(request.status),
            })}
          </Text>
        )}
      </ScreenContainer>

      <FeedbackModal
        visible={confirmAction != null}
        variant={confirmAction === 'reject' ? 'error' : 'success'}
        title={
          confirmAction === 'approve'
            ? t('admin.updateDetail.confirmApproveTitle')
            : confirmAction === 'reject'
              ? t('admin.updateDetail.confirmRejectTitle')
              : t('admin.updateDetail.confirmRestoreTitle')
        }
        subtitle={
          confirmAction === 'approve'
            ? t('admin.updateDetail.confirmApproveBody')
            : confirmAction === 'reject'
              ? t('admin.updateDetail.confirmRejectBody')
              : t('admin.updateDetail.confirmRestoreBody')
        }
        primaryLabel={
          acting
            ? t('admin.working')
            : confirmAction === 'approve'
              ? t('admin.updateDetail.approveAction')
              : confirmAction === 'reject'
                ? t('admin.updateDetail.rejectAction')
                : t('admin.updateDetail.restoreAction')
        }
        onPrimary={() => {
          void runAction();
        }}
        secondaryLabel={t('common.cancel')}
        onSecondary={() => {
          if (!acting) {
            setConfirmAction(null);
          }
        }}
      />

      <FeedbackModal
        visible={successVisible}
        variant="success"
        title={t('admin.updateDetail.successTitle')}
        subtitle={successMessageKey ? t(successMessageKey as never) : ''}
        primaryLabel={t('common.done')}
        onPrimary={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoCol: {
    flex: 1,
    gap: spacing.xs,
  },
  photoLabel: {
    ...typography.caption,
  },
  photo: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStrip: {
    gap: spacing.sm,
  },
  photoChangeNote: {
    ...typography.caption,
    fontWeight: '600',
  },
  compareCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
  },
  compareRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  compareCol: {
    flex: 1,
    gap: 4,
  },
  compareHeading: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  compareValue: {
    ...typography.bodySmall,
  },
  compareValueChanged: {
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
    // Extra space above floating tab bar inset from ScreenContainer.
    paddingBottom: spacing.lg,
  },
  error: {
    ...typography.bodySmall,
  },
  statusNote: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
