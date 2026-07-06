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
import { resetToMain } from '../navigation/navigationHelpers';
import { getCurrentSession, updatePassword } from '../services';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import { validatePasswordConfirmation } from '../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.RESET_PASSWORD>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
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
      setError(result.error ?? 'Could not update password. Please try again.');
      return;
    }

    setSuccess('Password updated successfully.');

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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Set new password</Text>
        </AuthStaggerItem>

        <AuthStaggerItem index={1}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose a new password for your account.
          </Text>
        </AuthStaggerItem>

        <View style={styles.form}>
          <AuthStaggerItem index={2}>
            <AppTextInput
              label="New password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </AuthStaggerItem>
          <AuthStaggerItem index={3}>
            <AppTextInput
              label="Confirm password"
              placeholder="••••••••"
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
              title={loading ? 'Updating…' : 'Update password'}
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
