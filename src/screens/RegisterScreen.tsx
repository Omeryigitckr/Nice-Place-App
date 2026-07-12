import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  AppButton,
  AppCard,
  AppTextInput,
  AuthErrorMessage,
  AuthLegalFooter,
  AuthOrDivider,
  AuthScreenLayout,
  AuthSocialButtons,
  AuthStaggerItem,
} from '../components';
import { AUTH_ROUTES } from '../constants';
import { resetToMain } from '../navigation/navigationHelpers';
import { signUpWithEmail } from '../services';
import { signInWithApple, signInWithGoogle } from '../services/socialAuthService';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import { getLocalizedAuthError, isAuthCancellationError } from '../utils/authErrors';
import {
  getRegistrationPasswordHint,
  validateEmail,
  validateRegistrationPassword,
} from '../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.REGISTER>;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const isBusy = loading || socialLoading !== null;

  const handleSignUp = async () => {
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validateRegistrationPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(email.trim(), password, fullName.trim());
    setLoading(false);

    if (!result.success) {
      setError(getLocalizedAuthError(result.error, 'auth.errors.signUpFailed'));
      return;
    }

    resetToMain(navigation);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSocialLoading('google');
    const result = await signInWithGoogle();
    setSocialLoading(null);

    if (!result.success) {
      if (!isAuthCancellationError(result.error)) {
        setError(getLocalizedAuthError(result.error, 'auth.errors.googleFailed'));
      }
      return;
    }

    resetToMain(navigation);
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setSocialLoading('apple');
    const result = await signInWithApple();
    setSocialLoading(null);

    if (!result.success) {
      if (!isAuthCancellationError(result.error)) {
        setError(getLocalizedAuthError(result.error, 'auth.errors.appleFailed'));
      }
      return;
    }

    resetToMain(navigation);
  };

  return (
    <AuthScreenLayout>
      <AppCard elevated style={styles.card}>
        <AuthStaggerItem index={0}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.register.title')}
          </Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.register.subtitle')}
          </Text>
        </AuthStaggerItem>

        <View style={styles.form}>
          <AuthStaggerItem index={2}>
            <AppTextInput
              label={t('auth.register.fullNameLabel')}
              placeholder={t('auth.register.fullNamePlaceholder')}
              autoComplete="name"
              value={fullName}
              onChangeText={setFullName}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={3}>
            <AppTextInput
              label={t('auth.register.emailLabel')}
              placeholder={t('auth.register.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={4}>
            <AppTextInput
              label={t('auth.register.passwordLabel')}
              placeholder={t('auth.register.passwordPlaceholder')}
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />
            <Text style={[styles.passwordHint, { color: colors.textMuted }]}>
              {getRegistrationPasswordHint()}
            </Text>
          </AuthStaggerItem>
        </View>

        <AuthStaggerItem index={5}>
          <AuthErrorMessage message={error} />
        </AuthStaggerItem>

        <View style={styles.actions}>
          <AuthStaggerItem index={6}>
            <AppButton
              title={loading ? t('auth.register.submitting') : t('auth.register.submit')}
              onPress={handleSignUp}
              disabled={isBusy}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={7}>
            <AuthOrDivider />
          </AuthStaggerItem>
          <AuthStaggerItem index={8}>
            <AuthSocialButtons
              onGooglePress={handleGoogleSignIn}
              onApplePress={handleAppleSignIn}
              disabled={isBusy}
              loadingProvider={socialLoading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={9}>
            <AppButton
              title={t('auth.register.alreadyHaveAccount')}
              variant="ghost"
              onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
              disabled={isBusy}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={10}>
            <AppButton
              title={t('auth.guest.continue')}
              variant="secondary"
              onPress={() => resetToMain(navigation)}
              disabled={isBusy}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={11}>
            <AuthLegalFooter />
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
  passwordHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
