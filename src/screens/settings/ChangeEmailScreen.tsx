import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  AppButton,
  AppTextInput,
  AuthErrorMessage,
  ScreenContainer,
} from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { requestEmailChange } from '../../services';
import { spacing } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';
import { ProfileStackParamList } from '../../types';
import { getLocalizedAuthError } from '../../utils/authErrors';
import { validateEmail } from '../../utils/authValidation';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.CHANGE_EMAIL>;

export function ChangeEmailScreen(_props: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!user?.email) {
      setError(t('auth.emailChange.signInRequired'));
      return;
    }

    const emailError = validateEmail(newEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (newEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) {
      setError(t('auth.emailChange.differentEmailRequired'));
      return;
    }

    setLoading(true);
    const result = await requestEmailChange(newEmail);
    setLoading(false);

    if (!result.success) {
      setError(getLocalizedAuthError(result.error, 'auth.errors.emailChangeFailed'));
      return;
    }

    setNewEmail('');
    setSuccess(t('auth.emailChange.successMessage'));
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title={t('auth.emailChange.title')} entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          {t('auth.emailChange.description')}
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.emailChange.currentEmailLabel')}
          </Text>
          <Text style={[styles.currentEmail, { color: colors.textPrimary }]}>
            {user?.email ?? t('common.notAvailable')}
          </Text>

          <AppTextInput
            label={t('auth.emailChange.newEmailLabel')}
            placeholder={t('auth.emailChange.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={newEmail}
            onChangeText={setNewEmail}
            editable={!loading}
          />

          {success ? (
            <Text style={[styles.success, { color: colors.success }]}>{success}</Text>
          ) : null}

          <AuthErrorMessage message={error} />

          <AppButton
            title={loading ? t('auth.emailChange.submitting') : t('auth.emailChange.submit')}
            onPress={handleSubmit}
            disabled={loading}
            fullWidth={false}
          />
        </View>
      </SettingsSection>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  label: {
    ...settingsStyles.groupLabel,
  },
  currentEmail: {
    ...settingsStyles.helperText,
    marginBottom: spacing.xs,
  },
  success: {
    ...settingsStyles.helperText,
  },
});
