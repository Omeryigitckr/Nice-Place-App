import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  AppButton,
  AppCard,
  AppTextInput,
  AuthErrorMessage,
  AuthScreenLayout,
  AuthStaggerItem,
} from '../components';
import { AUTH_ROUTES } from '../constants';
import { resetToMain } from '../navigation/navigationHelpers';
import { getCurrentSession, updatePassword } from '../services';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import { getLocalizedAuthError } from '../utils/authErrors';
import { validatePasswordConfirmation } from '../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.RESET_PASSWORD>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validatePasswordConfirmation(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.success) {
      setError(getLocalizedAuthError(result.error, 'auth.errors.updatePasswordFailed'));
      return;
    }

    setSuccess(t('auth.resetPassword.successMessage'));

    setTimeout(async () => {
      const session = await getCurrentSession();
      if (session?.user) {
        resetToMain(navigation);
        return;
      }
      navigation.navigate(AUTH_ROUTES.LOGIN);
    }, 1200);
  };

  return (
    <AuthScreenLayout>
      <AppCard elevated style={styles.card}>
        <AuthStaggerItem index={0}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.resetPassword.title')}
          </Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.resetPassword.subtitle')}
          </Text>
        </AuthStaggerItem>

        <View style={styles.form}>
          <AuthStaggerItem index={2}>
            <AppTextInput
              label={t('auth.resetPassword.newPasswordLabel')}
              placeholder={t('auth.resetPassword.passwordPlaceholder')}
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={3}>
            <AppTextInput
              label={t('auth.resetPassword.confirmPasswordLabel')}
              placeholder={t('auth.resetPassword.passwordPlaceholder')}
              secureTextEntry
              autoComplete="new-password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
          </AuthStaggerItem>
        </View>

        {success ? (
          <AuthStaggerItem index={4}>
            <Text style={[styles.success, { color: colors.success }]}>{success}</Text>
          </AuthStaggerItem>
        ) : null}

        <AuthStaggerItem index={5}>
          <AuthErrorMessage message={error} />
        </AuthStaggerItem>

        <View style={styles.actions}>
          <AuthStaggerItem index={6}>
            <AppButton
              title={
                loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')
              }
              onPress={handleUpdatePassword}
              disabled={loading || success != null}
            />
          </AuthStaggerItem>
        </View>
      </AppCard>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  subtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  success: {
    ...typography.bodySmall,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
