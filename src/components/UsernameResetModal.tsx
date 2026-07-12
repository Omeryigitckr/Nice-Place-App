import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from './AppButton';
import { AppTextInput } from './AppTextInput';
import { showAppToast } from '../feedback';
import { useAuth } from '../hooks/useAuth';
import { completeUsernameReset } from '../services/profileModerationService';
import { normalizeUsername, validateUsername } from '../services/settingsService';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { localizeProfileMessage, localizeReportError } from '../utils/profileMessages';

interface UsernameResetModalProps {
  visible: boolean;
  onCompleted: () => void;
}

export function UsernameResetModal({ visible, onCompleted }: UsernameResetModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { refresh } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const normalized = normalizeUsername(username);
    const validationError = validateUsername(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    const result = await completeUsernameReset(normalized);
    setSaving(false);

    if (!result.success) {
      setError(
        localizeReportError(result.error, result.message) ||
          t('profile.moderation.usernameReset.saveFailed'),
      );
      return;
    }

    await refresh();
    showAppToast(t('profile.toasts.usernameUpdated'), { tone: 'success' });
    setUsername('');
    onCompleted();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { paddingTop: insets.top + spacing.lg }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.lg,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('profile.moderation.usernameReset.title')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t('profile.moderation.usernameReset.body')}
          </Text>

          <AppTextInput
            label={t('profile.edit.username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>
              {localizeProfileMessage(error) ?? error}
            </Text>
          ) : null}

          <AppButton
            title={t('profile.moderation.usernameReset.save')}
            onPress={() => void handleSave()}
            loading={saving}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  error: {
    ...typography.caption,
  },
});
