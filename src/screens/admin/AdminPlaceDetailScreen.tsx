import { Ionicons } from '@expo/vector-icons';
import Mapbox, { Camera, MapView, MarkerView, StyleURL } from '@rnmapbox/maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, CachedImage, EmptyState, PlaceCategoryChips, ScreenContainer } from '../../components';
import { FeedbackModal } from '../../components/FeedbackModal';
import { PROFILE_ROUTES } from '../../constants';
import {
  getAccessTypeLabel,
  getBestTimeLabel,
  getCrowdLevelLabel,
  getDifficultyLabel,
} from '../../constants/addPlaceOptions';
import { useAdminAccess } from '../../hooks';
import {
  approvePlace,
  fetchPlaceCategoriesByPlaceIds,
  getPlaceForAdminReview,
  getPlacePhotos,
  rejectPlace,
  restoreRejectedPlace,
} from '../../services';
import { normalizePlaceCategories } from '../../constants/placeCategories';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { DbPlace } from '../../types/database';
import { ProfileStackParamList } from '../../types';
import {
  formatAdminDateTime,
  getPlaceStatusLabel,
  isAdminAccessGateMessage,
  localizeAdminMessage,
} from '../../utils/adminMessages';
import { getMapboxConfigError, getMapboxToken } from '../../utils/mapbox';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_PLACE_DETAIL
>;

type ConfirmAction = 'approve' | 'reject' | 'restore' | null;

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { textPrimary: string; textSecondary: string; border: string };
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function AdminLocationPreview({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const { colors } = useTheme();
  const [tokenReady, setTokenReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const mapboxError = getMapboxConfigError();
  const coordsLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  useEffect(() => {
    if (mapboxError) {
      setMapFailed(true);
      return;
    }

    const token = getMapboxToken();
    if (!token) {
      setMapFailed(true);
      return;
    }

    let mounted = true;
    Mapbox.setAccessToken(token)
      .then(() => {
        if (mounted) {
          setTokenReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setMapFailed(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [mapboxError]);

  if (mapFailed || mapboxError || !tokenReady) {
    return (
      <View
        style={[
          styles.mapFallback,
          { backgroundColor: colors.input, borderColor: colors.border },
        ]}
      >
        <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.mapFallbackText, { color: colors.textSecondary }]}>
          {coordsLabel}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.mapPreview, { borderColor: colors.border }]}
      pointerEvents="none"
    >
      <MapView
        style={styles.map}
        styleURL={StyleURL.Outdoors}
        scaleBarEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        onDidFailLoadingMap={() => setMapFailed(true)}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: [longitude, latitude],
            zoomLevel: 14,
          }}
        />
        <MarkerView coordinate={[longitude, latitude]} anchor={{ x: 0.5, y: 1 }} allowOverlap>
          <Ionicons name="location" size={28} color={colors.accent} />
        </MarkerView>
      </MapView>
    </View>
  );
}

export function AdminPlaceDetailScreen({ navigation, route }: Props) {
  const { placeId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();

  const [place, setPlace] = useState<DbPlace | null>(null);
  const [categoryKeys, setCategoryKeys] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessageKey, setSuccessMessageKey] = useState('');

  const emDash = t('admin.emDash');

  const loadPlace = useCallback(async () => {
    if (adminLoading || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await getPlaceForAdminReview(placeId);
    if (result.error || !result.place) {
      setPlace(null);
      const message = result.error ?? 'admin.errors.placeNotFound';
      if (!isAdminAccessGateMessage(message)) {
        setError(message);
      }
      setLoading(false);
      return;
    }

    setPlace(result.place);
    const categoryMap = await fetchPlaceCategoriesByPlaceIds([placeId]);
    const keys = categoryMap[placeId] ?? normalizePlaceCategories([result.place.category ?? '']);
    setCategoryKeys(keys);
    const photos = await getPlacePhotos(placeId, { includePending: true });
    const urls = photos.map((photo) => photo.imageUrl);
    setPhotoUrls(
      urls.length > 0
        ? urls
        : result.place.cover_photo_url
          ? [result.place.cover_photo_url]
          : [],
    );
    setLoading(false);
  }, [adminLoading, isAdmin, placeId]);

  useEffect(() => {
    void loadPlace();
  }, [loadPlace]);

  const runAction = async () => {
    if (!place || !confirmAction || acting) {
      return;
    }

    const action = confirmAction;
    // Use route param id (same id used to load) — matches SQL WHERE id = '...'
    const targetPlaceId = placeId.trim();

    setActing(true);
    setError(null);

    const result =
      action === 'approve'
        ? await approvePlace(targetPlaceId)
        : action === 'reject'
          ? await rejectPlace(targetPlaceId)
          : await restoreRejectedPlace(targetPlaceId);

    setActing(false);
    setConfirmAction(null);

    if (!result.success) {
      setError(
        result.error ??
          (action === 'restore'
            ? 'admin.errors.actionFailed'
            : action === 'reject'
              ? 'admin.errors.rejectPlaceFailed'
              : 'admin.errors.approvePlaceFailed'),
      );
      return;
    }

    if (action === 'restore') {
      setPlace((current) => (current ? { ...current, status: 'pending' } : current));
      setSuccessMessageKey('admin.placeDetail.successRestore');
    } else {
      setSuccessMessageKey(
        action === 'approve'
          ? 'admin.placeDetail.successApprove'
          : 'admin.placeDetail.successReject',
      );
    }
    setSuccessVisible(true);
  };

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('admin.checkingAccess')}
        </Text>
      </ScreenContainer>
    );
  }

  if (!authUserId) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
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
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
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
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('admin.placeDetail.loading')}
        </Text>
      </ScreenContainer>
    );
  }

  if (!place) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('admin.placeDetail.notFoundTitle')}
          description={localizeAdminMessage(error) ?? t('admin.placeDetail.notFoundBody')}
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

  const isPending = place.status === 'pending';
  const isRejected = place.status === 'rejected';
  const statusLabel = getPlaceStatusLabel(place.status);

  return (
    <>
      <ScreenContainer
        scrollable
        safeTop={false}
        reserveFloatingTabBar
        contentStyle={styles.content}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('admin.placeDetail.submittedPhotos')}
        </Text>
        {photoUrls.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {photoUrls.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
                <CachedImage
                  uri={uri}
                  width={160}
                  height={120}
                  borderRadius={radius.lg}
                  recyclingKey={`admin-place-${place.id}-${index}`}
                  priority="high"
                />
                {index === 0 ? (
                  <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.coverBadgeText, { color: colors.textInverse }]}>
                      {t('admin.placeDetail.cover')}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : (
          <CachedImage
            uri={place.cover_photo_url}
            width="100%"
            height={200}
            borderRadius={radius.lg}
            recyclingKey={place.id}
            priority="high"
          />
        )}

        <Text style={[styles.title, { color: colors.textPrimary }]}>{place.title}</Text>
        <PlaceCategoryChips
          place={{
            categories: categoryKeys,
            categorySlug: place.category ?? '',
            category: place.category ?? '',
          }}
          maxVisible={8}
        />
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{statusLabel}</Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <DetailRow
            label={t('admin.fields.description')}
            value={place.description?.trim() || emDash}
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.bestTime')}
            value={place.best_time ? getBestTimeLabel(place.best_time) : emDash}
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.access')}
            value={place.access_type ? getAccessTypeLabel(place.access_type) : emDash}
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.difficulty')}
            value={
              place.difficulty_level ? getDifficultyLabel(place.difficulty_level) : emDash
            }
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.crowd')}
            value={place.crowd_level ? getCrowdLevelLabel(place.crowd_level) : emDash}
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.location')}
            value={`${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`}
            colors={colors}
          />
          <View style={styles.mapSection}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {t('admin.fields.mapPreview')}
            </Text>
            <AdminLocationPreview latitude={place.latitude} longitude={place.longitude} />
          </View>
          <DetailRow
            label={t('admin.fields.submitted')}
            value={formatAdminDateTime(place.created_at, i18n.language)}
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.creatorId')}
            value={place.created_by ?? emDash}
            colors={colors}
          />
          <DetailRow
            label={t('admin.fields.safetyNote')}
            value={place.safety_note?.trim() || emDash}
            colors={colors}
          />
        </View>

        <View style={styles.flags}>
          {[
            place.is_pet_friendly && t('admin.flags.petFriendly'),
            place.is_child_friendly && t('admin.flags.childFriendly'),
            place.is_car_accessible && t('admin.flags.carAccessible'),
            place.is_camp_allowed && t('admin.flags.campAllowed'),
            place.is_picnic_suitable && t('admin.flags.picnicSuitable'),
          ]
            .filter(Boolean)
            .map((label) => (
              <View
                key={String(label)}
                style={[
                  styles.flag,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                ]}
              >
                <Text style={[styles.flagText, { color: colors.primary }]}>{label}</Text>
              </View>
            ))}
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {localizeAdminMessage(error)}
          </Text>
        ) : null}

        {isPending ? (
          <View style={styles.actions}>
            <AppButton
              title={t('admin.placeDetail.approve')}
              onPress={() => setConfirmAction('approve')}
              disabled={acting}
            />
            <AppButton
              title={t('admin.placeDetail.reject')}
              variant="secondary"
              onPress={() => setConfirmAction('reject')}
              disabled={acting}
            />
          </View>
        ) : isRejected ? (
          <View style={styles.actions}>
            <AppButton
              title={t('admin.placeDetail.restore')}
              onPress={() => setConfirmAction('restore')}
              disabled={acting}
            />
          </View>
        ) : (
          <View style={styles.statusBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statusNote, { color: colors.textSecondary }]}>
              {t('admin.placeDetail.alreadyStatus', { status: statusLabel })}
            </Text>
          </View>
        )}
      </ScreenContainer>

      <FeedbackModal
        visible={confirmAction != null}
        variant={confirmAction === 'reject' ? 'error' : 'success'}
        title={
          confirmAction === 'approve'
            ? t('admin.placeDetail.confirmApproveTitle')
            : confirmAction === 'reject'
              ? t('admin.placeDetail.confirmRejectTitle')
              : t('admin.placeDetail.confirmRestoreTitle')
        }
        subtitle={
          confirmAction === 'approve'
            ? t('admin.placeDetail.confirmApproveBody')
            : confirmAction === 'reject'
              ? t('admin.placeDetail.confirmRejectBody')
              : t('admin.placeDetail.confirmRestoreBody')
        }
        primaryLabel={
          acting
            ? t('admin.working')
            : confirmAction === 'approve'
              ? t('admin.placeDetail.approveAction')
              : confirmAction === 'reject'
                ? t('admin.placeDetail.rejectAction')
                : t('admin.placeDetail.restoreAction')
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
        title={t('admin.placeDetail.successTitle')}
        subtitle={successMessageKey ? t(successMessageKey as never) : ''}
        primaryLabel={t('admin.placeDetail.backToAdmin')}
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
    // Bottom inset comes from ScreenContainer reserveFloatingTabBar — do not override paddingBottom.
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
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
  },
  photoStrip: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  photoThumbWrap: {
    position: 'relative',
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
  title: {
    ...typography.screenTitle,
  },
  meta: {
    ...typography.bodySmall,
    marginTop: -spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  detailRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  detailLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    ...typography.bodySmall,
  },
  mapSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  mapPreview: {
    height: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapFallbackText: {
    ...typography.bodySmall,
    flex: 1,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flag: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  flagText: {
    ...typography.caption,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  error: {
    ...typography.bodySmall,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusNote: {
    ...typography.bodySmall,
    flex: 1,
  },
});
