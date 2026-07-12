import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PROFILE_REPORT_DETAILS_MAX,
  PROFILE_REPORT_REASON_LIST,
  type ProfileReportReason,
} from '../constants/profileModeration';
import { showAppToast } from '../feedback';
import { reportProfile } from '../services/profileModerationService';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { localizeReportError } from '../utils/profileMessages';

import { AppButton } from './AppButton';
import { AppTextInput } from './AppTextInput';

interface ReportProfileModalProps {
  visible: boolean;
  reportedAuthUserId: string | null;
  reportedUsername?: string | null;
  onClose: () => void;
}

export function ReportProfileModal({
  visible,
  reportedAuthUserId,
  reportedUsername,
  onClose,
}: ReportProfileModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const [reason, setReason] = useState<ProfileReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason(null);
    setDetails('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reportedAuthUserId || !reason || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await reportProfile({
      reportedAuthUserId,
      reason,
      details: details.trim() || undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(localizeReportError(result.error, result.message));
      return;
    }

    showAppToast(t('profile.toasts.reportSubmitted'), { tone: 'success', durationMs: 2000 });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            ...shadows.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('profile.report.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {reportedUsername
            ? t('profile.report.subtitleNamed', { username: reportedUsername })
            : t('profile.report.subtitle')}
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {PROFILE_REPORT_REASON_LIST.map((item) => {
            const selected = reason === item;
            return (
              <Pressable
                key={item}
                onPress={() => setReason(item)}
                style={[
                  styles.reasonRow,
                  {
                    backgroundColor: selected ? colors.primaryLight : colors.surfaceSecondary,
                    borderColor: selected ? colors.primaryBorder : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.reasonLabel,
                    { color: selected ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {t(`profile.report.reasons.${item}`)}
                </Text>
              </Pressable>
            );
          })}

          <AppTextInput
            label={t('profile.report.detailsLabel')}
            value={details}
            onChangeText={(value) => setDetails(value.slice(0, PROFILE_REPORT_DETAILS_MAX))}
            multiline
            numberOfLines={3}
            maxLength={PROFILE_REPORT_DETAILS_MAX}
            placeholder={t('profile.report.detailsPlaceholder')}
          />
          <Text style={[styles.counter, { color: colors.textMuted }]}>
            {details.length}/{PROFILE_REPORT_DETAILS_MAX}
          </Text>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.actions}>
          <AppButton
            title={t('common.cancel')}
            variant="secondary"
            onPress={handleClose}
            fullWidth={false}
          />
          <AppButton
            title={t('profile.report.submit')}
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={!reason || submitting}
            fullWidth={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    maxHeight: '82%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 99,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  reasonRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  reasonLabel: {
    ...typography.label,
    fontWeight: '600',
  },
  counter: {
    ...typography.caption,
    marginTop: -spacing.xs,
  },
  error: {
    ...typography.caption,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
