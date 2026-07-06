import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { validateNewPassword } from '../../utils/authValidation';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.CHANGE_PASSWORD>;

export function ChangePasswordScreen(_props: Props) {
  const colors = useThemeColors();
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
      setError('Sign in to change your password.');
      return;
    }

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    const newPasswordError = validateNewPassword(newPassword);
    if (newPasswordError) {
      setError(newPasswordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    const result = await changePasswordWithReauth(user.email, currentPassword, newPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Could not update password. Please try again.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setToastMessage('Password updated successfully.');
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

      <SettingsSection title="Change password" entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          Re-enter your current password, then choose a new one.
        </Text>

        <View style={styles.form}>
          <AppTextInput
            label="Current password"
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!loading}
          />
          <AppTextInput
            label="New password"
            placeholder="••••••••"
            secureTextEntry
            autoComplete="new-password"
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
          />
          <AppTextInput
            label="Confirm new password"
            placeholder="••••••••"
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
          <AuthErrorMessage message={error} />
          <AppButton
            title={loading ? 'Updating…' : 'Update password'}
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
