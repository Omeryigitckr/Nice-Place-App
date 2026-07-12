import { BellRing } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton, AppTextInput, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { showAppToast } from '../../feedback';
import { broadcastNotification } from '../../services/notificationService';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { ProfileStackParamList } from '../../types';
import { localizeAdminMessage } from '../../utils/adminMessages';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_NOTIFICATION_BROADCAST
>;

type BroadcastKind = 'SYSTEM' | 'EVENT';

const TITLE_MAX = 80;
const BODY_MAX = 240;

export function AdminNotificationBroadcastScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const [kind, setKind] = useState<BroadcastKind>('SYSTEM');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    setSending(true);
    const result = await broadcastNotification({
      type: kind,
      title: title.trim(),
      body: body.trim(),
      data: { screen: 'notifications' },
    });
    setSending(false);
    setConfirmVisible(false);

    if (!result.success) {
      showAppToast(localizeAdminMessage(result.error) ?? t('admin.broadcast.sendFailed'), {
        tone: 'error',
      });
      return;
    }

    const recipientText =
      typeof result.sent === 'number'
        ? t('admin.broadcast.sentRecipients', { count: result.sent })
        : t('admin.broadcast.sentGeneric');
    showAppToast(recipientText, { tone: 'success', durationMs: 2200 });
    setTitle('');
    setBody('');
    navigation.goBack();
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {kind === 'SYSTEM'
          ? t('admin.broadcast.subtitleSystem')
          : t('admin.broadcast.subtitleEvent')}
      </Text>

      <View style={styles.kindRow}>
        <AppButton
          title={t('admin.broadcast.kindSystem')}
          variant={kind === 'SYSTEM' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setKind('SYSTEM')}
          fullWidth={false}
        />
        <AppButton
          title={t('admin.broadcast.kindEvent')}
          variant={kind === 'EVENT' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setKind('EVENT')}
          fullWidth={false}
        />
      </View>

      <AppTextInput
        label={t('admin.broadcast.titleLabel')}
        value={title}
        onChangeText={setTitle}
        maxLength={TITLE_MAX}
      />
      <Text style={[styles.counter, { color: colors.textMuted }]}>
        {title.length}/{TITLE_MAX}
      </Text>

      <AppTextInput
        label={t('admin.broadcast.messageLabel')}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={4}
        maxLength={BODY_MAX}
      />
      <Text style={[styles.counter, { color: colors.textMuted }]}>
        {body.length}/{BODY_MAX}
      </Text>

      <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.previewHeader}>
          <BellRing size={18} color={colors.primary} />
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
            {t('admin.broadcast.preview')}
          </Text>
        </View>
        <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
          {title.trim() || t('admin.broadcast.previewTitlePlaceholder')}
        </Text>
        <Text style={[styles.previewBody, { color: colors.textSecondary }]}>
          {body.trim() || t('admin.broadcast.previewBodyPlaceholder')}
        </Text>
      </View>

      <AppButton
        title={t('admin.broadcast.reviewSend')}
        onPress={() => setConfirmVisible(true)}
        loading={sending}
        disabled={!canSend}
        fullWidth={false}
      />

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setConfirmVisible(false)} />
        <View style={styles.modalCenter}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.lg },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('admin.broadcast.confirmTitle')}
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              {t('admin.broadcast.confirmBody')}
            </Text>
            <View style={styles.modalActions}>
              <AppButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setConfirmVisible(false)}
                fullWidth={false}
              />
              <AppButton
                title={t('admin.broadcast.sendNow')}
                onPress={() => void handleSend()}
                loading={sending}
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
  },
  subtitle: {
    ...typography.bodySmall,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  counter: {
    ...typography.caption,
    marginTop: -spacing.xs,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewTitle: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  previewBody: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  backdrop: {
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
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
