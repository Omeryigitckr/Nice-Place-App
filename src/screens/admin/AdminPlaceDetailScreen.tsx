import { Ionicons } from '@expo/vector-icons';
import Mapbox, { Camera, MapView, MarkerView, StyleURL } from '@rnmapbox/maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton, CachedImage, EmptyState, ScreenContainer } from '../../components';
import { FeedbackModal } from '../../components/FeedbackModal';
import { PROFILE_ROUTES } from '../../constants';
import { useAdminAccess } from '../../hooks';
import {
  approvePlace,
  getPlaceForAdminReview,
  rejectPlace,
  restoreRejectedPlace,
} from '../../services';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { DbPlace } from '../../types/database';
import { ProfileStackParamList } from '../../types';
import { getMapboxConfigError, getMapboxToken } from '../../utils/mapbox';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_PLACE_DETAIL
>;

type ConfirmAction = 'approve' | 'reject' | 'restore' | null;

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

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
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();

  const [place, setPlace] = useState<DbPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadPlace = useCallback(async () => {
    if (adminLoading || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await getPlaceForAdminReview(placeId);
    if (result.error || !result.place) {
      setPlace(null);
      const message = result.error ?? 'Place not found.';
      if (
        !message.toLowerCase().includes('admin access') &&
        !message.toLowerCase().includes('sign in as an admin')
      ) {
        setError(message);
      }
      setLoading(false);
      return;
    }

    setPlace(result.place);
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
            ? "Couldn't complete action. Please try again."
            : action === 'reject'
              ? "Couldn't reject the place. Please try again."
              : "Couldn't approve the place. Please try again."),
      );
      return;
    }

    if (action === 'restore') {
      setPlace((current) => (current ? { ...current, status: 'pending' } : current));
      setSuccessMessage('Place moved back to pending.');
    } else {
      setSuccessMessage(
        action === 'approve'
          ? 'Place approved and will appear on the map.'
          : 'Place rejected. It will not appear publicly.',
      );
    }
    setSuccessVisible(true);
  };

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking admin access…
        </Text>
      </ScreenContainer>
    );
  }

  if (!authUserId) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          description="Guests cannot access the admin panel."
        />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <EmptyState
          icon="lock-closed-outline"
          title="Access denied"
          description="This panel is only available to administrators."
        />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading place…
        </Text>
      </ScreenContainer>
    );
  }

  if (!place) {
    return (
      <ScreenContainer safeTop={false} contentStyle={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title="Place not found"
          description={error ?? 'This submission could not be loaded.'}
          action={
            <AppButton title="Go back" onPress={() => navigation.goBack()} fullWidth={false} />
          }
        />
      </ScreenContainer>
    );
  }

  const isPending = place.status === 'pending';
  const isRejected = place.status === 'rejected';

  return (
    <>
      <ScreenContainer
        scrollable
        safeTop={false}
        reserveFloatingTabBar
        contentStyle={styles.content}
      >
        <CachedImage
          uri={place.cover_photo_url}
          width="100%"
          height={200}
          borderRadius={radius.lg}
          recyclingKey={place.id}
          priority="high"
        />

        <Text style={[styles.title, { color: colors.textPrimary }]}>{place.title}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {place.category} · {place.status}
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <DetailRow
            label="Description"
            value={place.description?.trim() || '—'}
            colors={colors}
          />
          <DetailRow label="Best time" value={place.best_time ?? '—'} colors={colors} />
          <DetailRow label="Access" value={String(place.access_type ?? '—')} colors={colors} />
          <DetailRow
            label="Difficulty"
            value={String(place.difficulty_level ?? '—')}
            colors={colors}
          />
          <DetailRow label="Crowd" value={String(place.crowd_level ?? '—')} colors={colors} />
          <DetailRow
            label="Location"
            value={`${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`}
            colors={colors}
          />
          <View style={styles.mapSection}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Map preview</Text>
            <AdminLocationPreview latitude={place.latitude} longitude={place.longitude} />
          </View>
          <DetailRow label="Submitted" value={formatDate(place.created_at)} colors={colors} />
          <DetailRow label="Creator id" value={place.created_by ?? '—'} colors={colors} />
          <DetailRow
            label="Safety note"
            value={place.safety_note?.trim() || '—'}
            colors={colors}
          />
        </View>

        <View style={styles.flags}>
          {[
            place.is_pet_friendly && 'Pet friendly',
            place.is_child_friendly && 'Child friendly',
            place.is_car_accessible && 'Car accessible',
            place.is_camp_allowed && 'Camp allowed',
            place.is_picnic_suitable && 'Picnic suitable',
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

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        {isPending ? (
          <View style={styles.actions}>
            <AppButton
              title="Approve place"
              onPress={() => setConfirmAction('approve')}
              disabled={acting}
            />
            <AppButton
              title="Reject place"
              variant="secondary"
              onPress={() => setConfirmAction('reject')}
              disabled={acting}
            />
          </View>
        ) : isRejected ? (
          <View style={styles.actions}>
            <AppButton
              title="Restore to pending"
              onPress={() => setConfirmAction('restore')}
              disabled={acting}
            />
          </View>
        ) : (
          <View style={styles.statusBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statusNote, { color: colors.textSecondary }]}>
              This place is already {place.status}. No further action is needed.
            </Text>
          </View>
        )}
      </ScreenContainer>

      <FeedbackModal
        visible={confirmAction != null}
        variant={confirmAction === 'reject' ? 'error' : 'success'}
        title={
          confirmAction === 'approve'
            ? 'Approve this place?'
            : confirmAction === 'reject'
              ? 'Reject this place?'
              : 'Move this place back to pending review?'
        }
        subtitle={
          confirmAction === 'approve'
            ? 'It will become visible on the public map. This does not delete any data.'
            : confirmAction === 'reject'
              ? 'It will stay in the database as rejected and will not appear publicly.'
              : 'It will return to the pending queue for review.'
        }
        primaryLabel={
          acting
            ? 'Working…'
            : confirmAction === 'approve'
              ? 'Approve'
              : confirmAction === 'reject'
                ? 'Reject'
                : 'Restore'
        }
        onPrimary={() => {
          void runAction();
        }}
        secondaryLabel="Cancel"
        onSecondary={() => {
          if (!acting) {
            setConfirmAction(null);
          }
        }}
      />

      <FeedbackModal
        visible={successVisible}
        variant="success"
        title="Done"
        subtitle={successMessage}
        primaryLabel="Back to admin"
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
