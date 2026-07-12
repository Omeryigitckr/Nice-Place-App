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
import { requestPasswordReset } from '../services';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import { getLocalizedAuthError } from '../utils/authErrors';
import { validateEmail } from '../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.FORGOT_PASSWORD>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    setError(null);
    setSuccess(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (!result.success) {
      setError(getLocalizedAuthError(result.error, 'auth.errors.resetEmailFailed'));
      return;
    }

    setSuccess(t('auth.forgotPassword.successMessage'));
  };

  return (
    <AuthScreenLayout>
      <AppCard elevated style={styles.card}>
        <AuthStaggerItem index={0}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.forgotPassword.title')}
          </Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.forgotPassword.subtitle')}
          </Text>
        </AuthStaggerItem>

        <View style={styles.form}>
          <AuthStaggerItem index={2}>
            <AppTextInput
              label={t('auth.forgotPassword.emailLabel')}
              placeholder={t('auth.forgotPassword.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </AuthStaggerItem>
        </View>

        {success ? (
          <AuthStaggerItem index={3}>
            <Text style={[styles.success, { color: colors.success }]}>{success}</Text>
          </AuthStaggerItem>
        ) : null}

        <AuthStaggerItem index={4}>
          <AuthErrorMessage message={error} />
        </AuthStaggerItem>

        <View style={styles.actions}>
          <AuthStaggerItem index={5}>
            <AppButton
              title={
                loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')
              }
              onPress={handleSendResetLink}
              disabled={loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={6}>
            <AppButton
              title={t('auth.forgotPassword.backToSignIn')}
              variant="ghost"
              onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
              disabled={loading}
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
