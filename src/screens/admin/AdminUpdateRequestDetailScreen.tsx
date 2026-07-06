import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppTextInput, EmptyState, ScreenContainer } from '../../components';
import { FeedbackModal } from '../../components/FeedbackModal';
import { PROFILE_ROUTES } from '../../constants';
import { useAdminAccess } from '../../hooks';
import {
  approvePlaceUpdateRequest,
  getPlaceForAdminReview,
  getPlaceUpdateRequestById,
  rejectPlaceUpdateRequest,
  restoreRejectedPlaceUpdateRequest,
} from '../../services';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { DbPlace, DbPlaceUpdateRequest } from '../../types/database';
import { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_UPDATE_REQUEST
>;

type CompareField = {
  key: string;
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
};

function formatValue(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function buildComparisons(place: DbPlace, request: DbPlaceUpdateRequest): CompareField[] {
  const fields: Array<{ key: keyof DbPlaceUpdateRequest | string; label: string; placeKey: keyof DbPlace }> = [
    { key: 'title', label: 'Title', placeKey: 'title' },
    { key: 'description', label: 'Description', placeKey: 'description' },
    { key: 'category', label: 'Category', placeKey: 'category' },
    { key: 'latitude', label: 'Latitude', placeKey: 'latitude' },
    { key: 'longitude', label: 'Longitude', placeKey: 'longitude' },
    { key: 'access_type', label: 'Access type', placeKey: 'access_type' },
    { key: 'best_time', label: 'Best time', placeKey: 'best_time' },
    { key: 'difficulty_level', label: 'Difficulty', placeKey: 'difficulty_level' },
    { key: 'crowd_level', label: 'Crowd level', placeKey: 'crowd_level' },
    { key: 'cover_photo_url', label: 'Cover photo URL', placeKey: 'cover_photo_url' },
    { key: 'safety_note', label: 'Safety note', placeKey: 'safety_note' },
    { key: 'is_pet_friendly', label: 'Pet friendly', placeKey: 'is_pet_friendly' },
    { key: 'is_child_friendly', label: 'Child friendly', placeKey: 'is_child_friendly' },
    { key: 'is_car_accessible', label: 'Car accessible', placeKey: 'is_car_accessible' },
    { key: 'is_camp_allowed', label: 'Camp allowed', placeKey: 'is_camp_allowed' },
    { key: 'is_picnic_suitable', label: 'Picnic suitable', placeKey: 'is_picnic_suitable' },
  ];

  return fields.map((field) => {
    const oldRaw = place[field.placeKey];
    const newRaw = request[field.key as keyof DbPlaceUpdateRequest];
    const oldValue = formatValue(oldRaw);
    const newValue = formatValue(newRaw);
    return {
      key: field.key,
      label: field.label,
      oldValue,
      newValue,
      changed: oldValue !== newValue && newRaw != null,
    };
  });
}

export function AdminUpdateRequestDetailScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const { colors, shadows } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();

  const [request, setRequest] = useState<DbPlaceUpdateRequest | null>(null);
  const [place, setPlace] = useState<DbPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'restore' | null>(
    null,
  );
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    if (adminLoading || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    const requestResult = await getPlaceUpdateRequestById(requestId);
    if (requestResult.error || !requestResult.request) {
      const message = requestResult.error ?? 'Request not found.';
      if (
        !message.toLowerCase().includes('admin access') &&
        !message.toLowerCase().includes('sign in as an admin')
      ) {
        setError(message);
      }
      setLoading(false);
      return;
    }

    const placeResult = await getPlaceForAdminReview(requestResult.request.place_id);
    if (placeResult.error || !placeResult.place) {
      const message = placeResult.error ?? 'Place not found.';
      if (
        !message.toLowerCase().includes('admin access') &&
        !message.toLowerCase().includes('sign in as an admin')
      ) {
        setError(message);
      }
      setLoading(false);
      return;
    }

    setRequest(requestResult.request);
    setPlace(placeResult.place);
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
            ? "Couldn't complete action. Please try again."
            : action === 'approve'
              ? "Couldn't approve the update. Please try again."
              : "Couldn't reject the update. Please try again."),
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
      setSuccessMessage('Update moved back to pending.');
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
      setSuccessMessage(action === 'approve' ? 'Update approved.' : 'Update rejected.');
    }
    setSuccessVisible(true);
  };

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking admin access…
        </Text>
      </ScreenContainer>
    );
  }

  if (!authUserId) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
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
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
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
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading request…
        </Text>
      </ScreenContainer>
    );
  }

  if (error && (!request || !place)) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState icon="alert-circle-outline" title="Could not load request" description={error} />
      </ScreenContainer>
    );
  }

  if (!request || !place) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title="Request not found"
          description="This update request could not be loaded."
        />
      </ScreenContainer>
    );
  }

  const comparisons = buildComparisons(place, request);

  return (
    <>
      <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cover photos</Text>
          <View style={styles.photoRow}>
            <View style={styles.photoCol}>
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>Current</Text>
              {place.cover_photo_url ? (
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
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>Requested</Text>
              {request.cover_photo_url ? (
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
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Field comparison</Text>
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
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{field.label}</Text>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={[styles.compareHeading, { color: colors.textMuted }]}>Current</Text>
                  <Text style={[styles.compareValue, { color: colors.textSecondary }]}>
                    {field.oldValue}
                  </Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={[styles.compareHeading, { color: colors.textMuted }]}>Requested</Text>
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
            Admin note (optional)
          </Text>
          <AppTextInput
            label="Note"
            placeholder="Reason for approval or rejection"
            value={adminNote}
            onChangeText={setAdminNote}
            multiline
          />
        </View>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        {request.status === 'pending' ? (
          <View style={styles.actions}>
            <AppButton
              title="Approve update"
              onPress={() => setConfirmAction('approve')}
              disabled={acting}
            />
            <AppButton
              title="Reject update"
              variant="secondary"
              onPress={() => setConfirmAction('reject')}
              disabled={acting}
            />
          </View>
        ) : request.status === 'rejected' ? (
          <View style={styles.actions}>
            <AppButton
              title="Restore to pending"
              onPress={() => setConfirmAction('restore')}
              disabled={acting}
            />
          </View>
        ) : (
          <Text style={[styles.statusNote, { color: colors.textSecondary }]}>
            This request is already {request.status}.
          </Text>
        )}
      </ScreenContainer>

      <FeedbackModal
        visible={confirmAction != null}
        variant={confirmAction === 'reject' ? 'error' : 'success'}
        title={
          confirmAction === 'approve'
            ? 'Approve this update?'
            : confirmAction === 'reject'
              ? 'Reject this update?'
              : 'Move this update back to pending review?'
        }
        subtitle={
          confirmAction === 'approve'
            ? 'Requested fields will be applied to the live place. Nothing is deleted.'
            : confirmAction === 'reject'
              ? 'The live place will stay unchanged. The request will be marked rejected.'
              : 'It will return to the Updates pending queue for review.'
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
        title="Review complete"
        subtitle={successMessage}
        primaryLabel="Done"
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
