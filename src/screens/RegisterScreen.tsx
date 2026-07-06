import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AppButton,
  AppCard,
  AppTextInput,
  AuthErrorMessage,
  AuthLegalFooter,
  AuthScreenLayout,
  AuthStaggerItem,
} from '../components';
import { AUTH_ROUTES } from '../constants';
import { resetToMain } from '../navigation/navigationHelpers';
import { signUpWithEmail } from '../services';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import {
  REGISTRATION_PASSWORD_HINT,
  validateEmail,
  validateRegistrationPassword,
} from '../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.REGISTER>;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError(result.error ?? 'Sign up failed.');
      return;
    }

    resetToMain(navigation);
  };

  return (
    <AuthScreenLayout>
      <AppCard elevated style={styles.card}>
        <AuthStaggerItem index={0}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create account</Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start discovering beautiful places.
          </Text>
        </AuthStaggerItem>

        <View style={styles.form}>
          <AuthStaggerItem index={2}>
            <AppTextInput
              label="Full name"
              placeholder="Your name"
              autoComplete="name"
              value={fullName}
              onChangeText={setFullName}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={3}>
            <AppTextInput
              label="Email"
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={4}>
            <AppTextInput
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />
            <Text style={[styles.passwordHint, { color: colors.textMuted }]}>
              {REGISTRATION_PASSWORD_HINT}
            </Text>
          </AuthStaggerItem>
        </View>

        <AuthStaggerItem index={5}>
          <AuthErrorMessage message={error} />
        </AuthStaggerItem>

        <View style={styles.actions}>
          <AuthStaggerItem index={6}>
            <AppButton
              title={loading ? 'Creating account…' : 'Sign Up'}
              onPress={handleSignUp}
              disabled={loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={7}>
            <AppButton
              title="Already have an account"
              variant="ghost"
              onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
              disabled={loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={8}>
            <AppButton
              title="Continue as guest"
              variant="secondary"
              onPress={() => resetToMain(navigation)}
              disabled={loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={9}>
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
