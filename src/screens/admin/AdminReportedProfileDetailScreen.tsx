import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton, AppTextInput, CachedImage, EmptyState, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import {
  PROFILE_MODERATION_ACTIONS,
  type ProfileModerationAction,
} from '../../constants/profileModeration';
import { showAppToast } from '../../feedback';
import { useAdminAccess } from '../../hooks';
import {
  adminDeleteUserAccount,
  adminGetReportedProfileDetail,
  adminModerateProfile,
} from '../../services/profileModerationService';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import type { ReportedProfileDetail } from '../../types/profileModeration';
import { ProfileStackParamList } from '../../types';
import {
  ADMIN_DEFAULT_MODERATION_REASON,
  ADMIN_DELETE_USER_PHRASE,
  formatAdminDate,
  formatAdminDateTime,
  getModerationActionLabel,
  getProfileReportReasonLabel,
  getReportStatusLabel,
  localizeAdminMessage,
} from '../../utils/adminMessages';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_REPORTED_PROFILE_DETAIL
>;

type ActionModalKind =
  | 'mark_ok'
  | 'remove_photo'
  | 'reset_username'
  | 'suspend'
  | 'unsuspend'
  | 'dismiss_abuse'
  | 'delete'
  | null;

const SUSPEND_OPTIONS: Array<{
  action: Extract<
    ProfileModerationAction,
    'suspend_24h' | 'suspend_7d' | 'suspend_30d' | 'suspend_indefinite'
  >;
  labelKey:
    | 'admin.reports.duration24h'
    | 'admin.reports.duration7d'
    | 'admin.reports.duration30d'
    | 'admin.reports.durationIndefinite';
}> = [
  { action: 'suspend_24h', labelKey: 'admin.reports.duration24h' },
  { action: 'suspend_7d', labelKey: 'admin.reports.duration7d' },
  { action: 'suspend_30d', labelKey: 'admin.reports.duration30d' },
  { action: 'suspend_indefinite', labelKey: 'admin.reports.durationIndefinite' },
];

export function AdminReportedProfileDetailScreen({ navigation, route }: Props) {
  const { reportedUserId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();
  const [detail, setDetail] = useState<ReportedProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<ActionModalKind>(null);
  const [reason, setReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [suspendAction, setSuspendAction] = useState<(typeof SUSPEND_OPTIONS)[number]['action']>(
    'suspend_7d',
  );
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await adminGetReportedProfileDetail(reportedUserId);
    setDetail(next);
    setLoading(false);
  }, [reportedUserId]);

  useFocusEffect(
    useCallback(() => {
      if (!adminLoading && isAdmin) {
        void load();
      }
    }, [adminLoading, isAdmin, load]),
  );

  const closeModal = () => {
    if (submitting) {
      return;
    }
    setActionModal(null);
    setReason('');
    setAdminNote('');
    setDeleteConfirm('');
  };

  const runModerate = async (
    action: Exclude<ProfileModerationAction, 'delete_account'>,
    requiredReason = true,
  ) => {
    if (requiredReason && !reason.trim()) {
      showAppToast(t('admin.reports.toastReasonRequired'), { tone: 'error' });
      return;
    }

    setSubmitting(true);
    const result = await adminModerateProfile({
      targetAuthUserId: reportedUserId,
      action,
      reason: reason.trim() || ADMIN_DEFAULT_MODERATION_REASON,
      adminNote: adminNote.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      showAppToast(
        localizeAdminMessage(result.message) ?? t('admin.reports.toastActionFailed'),
        { tone: 'error' },
      );
      return;
    }

    showAppToast(t('admin.reports.toastApplied'), { tone: 'success' });
    closeModal();
    await load();
  };

  const handleDelete = async () => {
    if (deleteConfirm !== ADMIN_DELETE_USER_PHRASE) {
      showAppToast(t('admin.reports.toastTypePhrase', { phrase: ADMIN_DELETE_USER_PHRASE }), {
        tone: 'error',
      });
      return;
    }
    if (!reason.trim()) {
      showAppToast(t('admin.reports.toastReasonRequiredShort'), { tone: 'error' });
      return;
    }
    if (reportedUserId === authUserId) {
      showAppToast(t('admin.reports.toastCannotDeleteSelf'), { tone: 'error' });
      return;
    }

    setSubmitting(true);
    const result = await adminDeleteUserAccount({
      targetAuthUserId: reportedUserId,
      reason: reason.trim(),
    });
    setSubmitting(false);

    if (!result.success) {
      showAppToast(
        localizeAdminMessage(result.message) ?? t('admin.reports.toastDeleteFailed'),
        { tone: 'error' },
      );
      return;
    }

    showAppToast(t('admin.reports.toastDeleted'), { tone: 'success' });
    navigation.goBack();
  };

  if (adminLoading || loading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar>
        <EmptyState
          icon="lock-closed-outline"
          title={t('admin.access.deniedTitle')}
          description={t('admin.access.deniedShort')}
        />
      </ScreenContainer>
    );
  }

  const profile = detail?.profile;
  if (!profile || !detail?.success) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar>
        <EmptyState
          icon="alert-circle-outline"
          title={t('admin.reports.notFoundTitle')}
          description={
            localizeAdminMessage(detail?.error) ??
            detail?.error ??
            t('admin.reports.notFoundBody')
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {profile.avatar_url ? (
          <CachedImage uri={profile.avatar_url} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]} />
        )}
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          @{profile.username || t('admin.unknownUser')}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('admin.reports.idLabel', { id: profile.auth_user_id })}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('admin.reports.joined', {
            date: formatAdminDate(profile.created_at, i18n.language),
          })}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('admin.reports.countsWithStrikes', {
            open: detail.open_report_count ?? 0,
            total: detail.total_report_count ?? 0,
            strikes: profile.moderation_strikes,
          })}
        </Text>
        {profile.is_suspended ? (
          <Text style={[styles.badge, { color: colors.error }]}>
            {profile.suspended_until
              ? t('admin.reports.suspendedUntil', {
                  date: formatAdminDateTime(profile.suspended_until, i18n.language),
                })
              : t('admin.reports.suspendedIndefinitely')}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('admin.reports.actions')}
      </Text>
      <View style={styles.actionsGrid}>
        <AppButton
          title={t('admin.reports.markOk')}
          variant="secondary"
          size="sm"
          onPress={() => setActionModal('mark_ok')}
          fullWidth={false}
        />
        <AppButton
          title={t('admin.reports.removePhoto')}
          variant="secondary"
          size="sm"
          onPress={() => setActionModal('remove_photo')}
          fullWidth={false}
        />
        <AppButton
          title={t('admin.reports.resetUsername')}
          variant="secondary"
          size="sm"
          onPress={() => setActionModal('reset_username')}
          fullWidth={false}
        />
        <AppButton
          title={t('admin.reports.suspend')}
          variant="secondary"
          size="sm"
          onPress={() => setActionModal('suspend')}
          fullWidth={false}
        />
        {profile.is_suspended ? (
          <AppButton
            title={t('admin.reports.unsuspend')}
            variant="secondary"
            size="sm"
            onPress={() => setActionModal('unsuspend')}
            fullWidth={false}
          />
        ) : null}
        <AppButton
          title={t('admin.reports.dismissAbuse')}
          variant="ghost"
          size="sm"
          onPress={() => setActionModal('dismiss_abuse')}
          fullWidth={false}
        />
      </View>

      <View style={[styles.dangerCard, { borderColor: colors.error }]}>
        <Text style={[styles.sectionTitle, { color: colors.error }]}>
          {t('admin.reports.severe')}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('admin.reports.severeHint', { phrase: ADMIN_DELETE_USER_PHRASE })}
        </Text>
        <AppButton
          title={t('admin.reports.deleteAccount')}
          variant="secondary"
          size="sm"
          onPress={() => setActionModal('delete')}
          fullWidth={false}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('admin.reports.reportsSection')}
      </Text>
      {(detail.reports ?? []).map((report) => (
        <View
          key={report.id}
          style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>
            {getProfileReportReasonLabel(report.reason)}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {getReportStatusLabel(report.status)} ·{' '}
            {formatAdminDateTime(report.created_at, i18n.language)}
          </Text>
          {report.details ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{report.details}</Text>
          ) : null}
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {t('admin.reports.reporter', { id: report.reporter_user_id.slice(0, 8) })}
          </Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('admin.reports.history')}
      </Text>
      {(detail.actions ?? []).length === 0 ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('admin.reports.noHistory')}
        </Text>
      ) : (
        (detail.actions ?? []).map((action) => (
          <View
            key={action.id}
            style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>
              {getModerationActionLabel(action.action)}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{action.reason}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {formatAdminDateTime(action.created_at, i18n.language)}
            </Text>
          </View>
        ))
      )}

      <Modal visible={actionModal != null} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal} />
        <View style={styles.modalCenter}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.lg },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {actionModal === 'delete'
                ? t('admin.reports.confirmDeleteTitle')
                : t('admin.reports.confirmModeration')}
            </Text>

            {actionModal === 'suspend' ? (
              <View style={styles.suspendRow}>
                {SUSPEND_OPTIONS.map((option) => (
                  <Pressable
                    key={option.action}
                    onPress={() => setSuspendAction(option.action)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          suspendAction === option.action ? colors.primaryLight : colors.surfaceSecondary,
                        borderColor:
                          suspendAction === option.action ? colors.primaryBorder : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textPrimary }}>{t(option.labelKey)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <AppTextInput
              label={t('admin.fields.reason')}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
            {actionModal !== 'delete' ? (
              <AppTextInput
                label={t('admin.fields.adminNoteOptional')}
                value={adminNote}
                onChangeText={setAdminNote}
              />
            ) : (
              <AppTextInput
                label={t('admin.reports.typeDeletePhrase', { phrase: ADMIN_DELETE_USER_PHRASE })}
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                autoCapitalize="characters"
              />
            )}

            <View style={styles.modalActions}>
              <AppButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={closeModal}
                fullWidth={false}
              />
              <AppButton
                title={t('common.confirm')}
                loading={submitting}
                onPress={() => {
                  if (actionModal === 'mark_ok') {
                    void runModerate(PROFILE_MODERATION_ACTIONS.MARK_OK, false);
                  } else if (actionModal === 'remove_photo') {
                    void runModerate(PROFILE_MODERATION_ACTIONS.REMOVE_PROFILE_PHOTO);
                  } else if (actionModal === 'reset_username') {
                    void runModerate(PROFILE_MODERATION_ACTIONS.RESET_USERNAME);
                  } else if (actionModal === 'suspend') {
                    void runModerate(suspendAction);
                  } else if (actionModal === 'unsuspend') {
                    void runModerate(PROFILE_MODERATION_ACTIONS.UNSUSPEND);
                  } else if (actionModal === 'dismiss_abuse') {
                    void runModerate(PROFILE_MODERATION_ACTIONS.DISMISS_REPORT_ABUSE, false);
                  } else if (actionModal === 'delete') {
                    Alert.alert(
                      t('admin.reports.deleteAlertTitle'),
                      t('admin.reports.deleteAlertBody'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () => void handleDelete(),
                        },
                      ],
                    );
                  }
                }}
                fullWidth={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  username: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption,
  },
  badge: {
    ...typography.label,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dangerCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  reportTitle: {
    ...typography.label,
    fontWeight: '700',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  suspendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
