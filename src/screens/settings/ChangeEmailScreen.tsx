import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { validateEmail } from '../../utils/authValidation';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.CHANGE_EMAIL>;

const SUCCESS_MESSAGE =
  'A verification email has been sent to your new address. Open the link on this device to confirm the change.';

export function ChangeEmailScreen(_props: Props) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!user?.email) {
      setError('Sign in to change your email.');
      return;
    }

    const emailError = validateEmail(newEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (newEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) {
      setError('Enter a different email address.');
      return;
    }

    setLoading(true);
    const result = await requestEmailChange(newEmail);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Could not send verification email. Please try again.');
      return;
    }

    setNewEmail('');
    setSuccess(SUCCESS_MESSAGE);
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title="Change email" entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          We will send a confirmation link to your new email address.
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current email</Text>
          <Text style={[styles.currentEmail, { color: colors.textPrimary }]}>
            {user?.email ?? 'Not available'}
          </Text>

          <AppTextInput
            label="New email"
            placeholder="you@email.com"
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
            title={loading ? 'Sending…' : 'Send verification email'}
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
