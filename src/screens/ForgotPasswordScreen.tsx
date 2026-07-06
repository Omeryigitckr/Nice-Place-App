import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { validateEmail } from '../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.FORGOT_PASSWORD>;

const SUCCESS_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.';

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
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
      setError(result.error ?? 'Could not send reset email. Please try again.');
      return;
    }

    setSuccess(SUCCESS_MESSAGE);
  };

  return (
    <AuthScreenLayout>
      <AppCard elevated style={styles.card}>
        <AuthStaggerItem index={0}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Forgot password</Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we will send you a reset link.
          </Text>
        </AuthStaggerItem>

        <View style={styles.form}>
          <AuthStaggerItem index={2}>
            <AppTextInput
              label="Email"
              placeholder="you@email.com"
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
              title={loading ? 'Sending…' : 'Send reset link'}
              onPress={handleSendResetLink}
              disabled={loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={6}>
            <AppButton
              title="Back to sign in"
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
