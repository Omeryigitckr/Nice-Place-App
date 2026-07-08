import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { signInWithEmail } from '../services';
import { signInWithApple, signInWithGoogle } from '../services/socialAuthService';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.LOGIN>;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const isBusy = loading || socialLoading !== null;

  const handleSignIn = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Sign in failed.');
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
      if (result.error && !result.error.toLowerCase().includes('cancelled')) {
        setError(result.error);
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
      if (result.error && !result.error.toLowerCase().includes('cancelled')) {
        setError(result.error);
      }
      return;
    }

    resetToMain(navigation);
  };

  return (
    <AuthScreenLayout>
      <AppCard elevated style={styles.card}>
        <AuthStaggerItem index={0}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to save places and share discoveries.
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
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={3}>
            <AppTextInput
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => navigation.navigate(AUTH_ROUTES.FORGOT_PASSWORD)}
              disabled={isBusy}
              accessibilityRole="button"
              style={styles.forgotLinkWrap}
            >
              <Text style={[styles.forgotLink, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </Pressable>
          </AuthStaggerItem>
        </View>

        <AuthStaggerItem index={4}>
          <AuthErrorMessage message={error} />
        </AuthStaggerItem>

        <View style={styles.actions}>
          <AuthStaggerItem index={5}>
            <AppButton
              title={loading ? 'Signing in…' : 'Sign In'}
              onPress={handleSignIn}
              disabled={isBusy}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={6}>
            <AuthOrDivider />
          </AuthStaggerItem>
          <AuthStaggerItem index={7}>
            <AuthSocialButtons
              onGooglePress={handleGoogleSignIn}
              onApplePress={handleAppleSignIn}
              disabled={isBusy}
              loadingProvider={socialLoading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={8}>
            <AppButton
              title="Create account"
              variant="ghost"
              onPress={() => navigation.navigate(AUTH_ROUTES.REGISTER)}
              disabled={isBusy}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={9}>
            <AppButton
              title="Continue as guest"
              variant="secondary"
              onPress={() => resetToMain(navigation)}
              disabled={isBusy}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={10}>
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
  forgotLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  forgotLink: {
    ...typography.bodySmall,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
