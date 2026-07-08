import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AppButton,
  AppTextInput,
  AuthErrorMessage,
  ProfileAvatar,
  ScreenContainer,
  ToastBanner,
} from '../../components';
import { useThemeColors } from '../../theme/ThemeContext';
import { PROFILE_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { updateProfile } from '../../services';
import { ProfileStackParamList } from '../../types';
import {
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateUsername,
} from '../../services/settingsService';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_ACCOUNT>;

export function SettingsAccountScreen(_props: Props) {
  const colors = useThemeColors();
  const { user, profile, refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isGuest = !user || !profile;

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.full_name?.trim() ?? '');
    setUsername(profile.username?.trim() ?? '');
    setBio(profile.bio?.trim() ?? '');
  }, [profile]);

  const displayLabel =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'Explorer';

  const handleSaveAccount = async () => {
    if (!profile?.id) {
      setAccountError('Sign in to edit your profile.');
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    const displayNameError = validateDisplayName(displayName);
    const usernameError = validateUsername(normalizedUsername);
    const bioError = validateBio(bio);

    if (displayNameError || usernameError || bioError) {
      setAccountError(displayNameError ?? usernameError ?? bioError);
      return;
    }

    setAccountError(null);
    setSavingAccount(true);

    const result = await updateProfile(profile.id, {
      fullName: displayName.trim(),
      username: normalizedUsername,
      bio,
    });

    setSavingAccount(false);

    if (!result.success) {
      setAccountError(result.error ?? 'Could not save profile.');
      return;
    }

    await refresh();
    setToastMessage('Profile updated.');
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

      <SettingsSection title="Profile photo" entranceIndex={0}>
        {isGuest ? (
          <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
            Sign in to add a profile photo.
          </Text>
        ) : (
          <View style={settingsStyles.form}>
            <ProfileAvatar
              displayName={displayLabel}
              avatarUrl={profile?.avatar_url}
              profileId={profile?.id}
              authUserId={user?.id}
              previousStoragePath={profile?.avatar_storage_path}
              size={88}
              editable
              onAvatarUpdated={async () => {
                await refresh();
                setToastMessage('Profile photo updated.');
              }}
              onError={(message) => setToastMessage(message)}
            />
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              Tap your photo to choose a new avatar.
            </Text>
          </View>
        )}
      </SettingsSection>

      <SettingsSection title="Account details" entranceIndex={1}>
        {isGuest ? (
          <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
            Sign in to edit your display name, username, and bio.
          </Text>
        ) : (
          <View style={settingsStyles.form}>
            <AppTextInput
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              maxLength={60}
            />
            <AppTextInput
              label="Username"
              value={username}
              onChangeText={(value) => setUsername(normalizeUsername(value))}
              placeholder="your_username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            <AppTextInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="A short line about your exploring style"
              multiline
              numberOfLines={3}
              style={settingsStyles.bioInput}
              maxLength={240}
            />
            <AuthErrorMessage message={accountError} />
            <AppButton
              title={savingAccount ? 'Saving…' : 'Save account'}
              onPress={handleSaveAccount}
              disabled={savingAccount}
              fullWidth={false}
            />
          </View>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
