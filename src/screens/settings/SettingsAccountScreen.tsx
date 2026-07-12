import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

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
import { removeProfileAvatar, updateProfile } from '../../services';
import { ProfileStackParamList } from '../../types';
import {
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateUsername,
} from '../../services/settingsService';
import { localizeProfileMessage } from '../../utils/profileMessages';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_ACCOUNT>;

export function SettingsAccountScreen(_props: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { user, profile, refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isGuest = !user || !profile;
  const hasProfilePhoto = Boolean(profile?.avatar_url || profile?.avatar_storage_path);

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
    t('profile.explorerFallback');

  const handleSaveAccount = async () => {
    if (!profile?.id) {
      setAccountError('profile.auth.edit');
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
      setAccountError(result.error ?? 'profile.edit.saveFailed');
      return;
    }

    await refresh();
    setToastMessage(t('profile.toasts.updated'));
  };

  const handleRemovePhoto = () => {
    if (!profile?.id || !user?.id || removingPhoto) {
      return;
    }

    if (!hasProfilePhoto) {
      setToastMessage(t('profile.toasts.noPhotoToRemove'));
      return;
    }

    Alert.alert(
      t('profile.photo.removeTitle'),
      t('profile.photo.removeMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setRemovingPhoto(true);
              const result = await removeProfileAvatar({
                profileId: profile.id,
                authUserId: user.id,
                storagePath: profile.avatar_storage_path,
              });
              setRemovingPhoto(false);

              if (!result.success) {
                setToastMessage(
                  localizeProfileMessage(result.error) ??
                    t('profile.photo.removeFailed'),
                );
                return;
              }

              await refresh();
              setToastMessage(t('profile.toasts.photoRemoved'));
            })();
          },
        },
      ],
    );
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

      <SettingsSection title={t('profile.photo.sectionTitle')} entranceIndex={0}>
        {isGuest ? (
          <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
            {t('profile.auth.addPhoto')}
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
                setToastMessage(t('profile.toasts.photoUpdated'));
              }}
              onError={(message) => setToastMessage(message)}
            />
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              {t('profile.photo.tapHint')}
            </Text>
            {hasProfilePhoto ? (
              <AppButton
                title={
                  removingPhoto ? t('profile.photo.removing') : t('profile.photo.remove')
                }
                variant="secondary"
                onPress={handleRemovePhoto}
                disabled={removingPhoto || savingAccount}
                fullWidth={false}
              />
            ) : null}
          </View>
        )}
      </SettingsSection>

      <SettingsSection title={t('profile.edit.sectionTitle')} entranceIndex={1}>
        {isGuest ? (
          <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
            {t('profile.auth.editDetails')}
          </Text>
        ) : (
          <View style={settingsStyles.form}>
            <AppTextInput
              label={t('profile.edit.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile.edit.displayNamePlaceholder')}
              maxLength={60}
            />
            <AppTextInput
              label={t('profile.edit.username')}
              value={username}
              onChangeText={(value) => setUsername(normalizeUsername(value))}
              placeholder={t('profile.edit.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            <AppTextInput
              label={t('profile.edit.bio')}
              value={bio}
              onChangeText={setBio}
              placeholder={t('profile.edit.bioPlaceholder')}
              multiline
              numberOfLines={3}
              style={settingsStyles.bioInput}
              maxLength={240}
            />
            <AuthErrorMessage message={localizeProfileMessage(accountError)} />
            <AppButton
              title={savingAccount ? t('profile.edit.saving') : t('profile.edit.save')}
              onPress={handleSaveAccount}
              disabled={savingAccount || removingPhoto}
              fullWidth={false}
            />
          </View>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
