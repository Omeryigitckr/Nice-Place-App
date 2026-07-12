import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  AppButton,
  AppTextInput,
  AuthErrorMessage,
  ScreenContainer,
  ToastBanner,
} from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { changePasswordWithReauth } from '../../services';
import { spacing } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';
import { ProfileStackParamList } from '../../types';
import { getLocalizedAuthError } from '../../utils/authErrors';
import { validateNewPassword } from '../../utils/authValidation';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.CHANGE_PASSWORD>;

export function ChangePasswordScreen(_props: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    setError(null);

    if (!user?.email) {
      setError(t('auth.changePassword.signInRequired'));
      return;
    }

    if (!currentPassword) {
      setError(t('auth.validation.currentPasswordRequired'));
      return;
    }

    const newPasswordError = validateNewPassword(newPassword);
    if (newPasswordError) {
      setError(newPasswordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.validation.passwordsDoNotMatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('auth.validation.passwordMustDiffer'));
      return;
    }

    setLoading(true);
    const result = await changePasswordWithReauth(user.email, currentPassword, newPassword);
    setLoading(false);

    if (!result.success) {
      setError(getLocalizedAuthError(result.error, 'auth.errors.updatePasswordFailed'));
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setToastMessage(t('auth.changePassword.successMessage'));
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      {toastMessage ? (
        <ToastBanner
          message={toastMessage}
          visible={toastMessage != null}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}

      <SettingsSection title={t('auth.changePassword.title')} entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          {t('auth.changePassword.description')}
        </Text>

        <View style={styles.form}>
          <AppTextInput
            label={t('auth.changePassword.currentPasswordLabel')}
            placeholder={t('auth.changePassword.passwordPlaceholder')}
            secureTextEntry
            autoComplete="password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!loading}
          />
          <AppTextInput
            label={t('auth.changePassword.newPasswordLabel')}
            placeholder={t('auth.changePassword.passwordPlaceholder')}
            secureTextEntry
            autoComplete="new-password"
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
          />
          <AppTextInput
            label={t('auth.changePassword.confirmPasswordLabel')}
            placeholder={t('auth.changePassword.passwordPlaceholder')}
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
          <AuthErrorMessage message={error} />
          <AppButton
            title={
              loading
                ? t('auth.changePassword.submitting')
                : t('auth.changePassword.submit')
            }
            onPress={handleUpdatePassword}
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
});
