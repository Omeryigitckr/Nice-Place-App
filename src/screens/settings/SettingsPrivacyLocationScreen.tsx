import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { AppButton, PermissionBlockedModal, ScreenContainer, ToastBanner } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAppPermissions } from '../../hooks/useAppPermissions';
import { ProfileStackParamList } from '../../types';
import { getPermissionStatusLabel } from '../../utils/settingsMessages';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_PRIVACY_LOCATION>;

export function SettingsPrivacyLocationScreen(_props: Props) {
  const { t } = useTranslation();
  const { location, ensureLocationPermission, openAppSettings, refresh } = useAppPermissions();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [blockedVisible, setBlockedVisible] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRequestLocation = useCallback(async () => {
    const result = await ensureLocationPermission();
    if (result.granted) {
      setToastMessage(t('settings.privacyLocation.grantedToast'));
      return;
    }
    if (result.shouldOpenSettings) {
      setBlockedVisible(true);
      return;
    }
    setToastMessage(t('settings.privacyLocation.deniedToast'));
  }, [ensureLocationPermission, t]);

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      {toastMessage ? (
        <ToastBanner
          message={toastMessage}
          visible={toastMessage != null}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}

      <SettingsSection title={t('settings.sections.location')} entranceIndex={0}>
        <Text style={settingsStyles.helperText}>
          {t('settings.privacyLocation.helper')}
        </Text>
        <Text style={settingsStyles.statusLabel}>
          {t('settings.privacyLocation.statusLabel')}
        </Text>
        <Text style={settingsStyles.statusValue}>
          {getPermissionStatusLabel(location.state)}
        </Text>
        <AppButton
          title={t('settings.privacyLocation.request')}
          variant="secondary"
          onPress={() => void handleRequestLocation()}
          fullWidth={false}
        />
        <AppButton
          title={t('settings.privacyLocation.openDeviceSettings')}
          variant="ghost"
          onPress={() => void openAppSettings()}
          fullWidth={false}
        />
      </SettingsSection>

      <PermissionBlockedModal
        visible={blockedVisible}
        title={t('map.location.blockedTitle')}
        message={t('map.location.blockedMessage')}
        onCancel={() => setBlockedVisible(false)}
        onOpenSettings={() => {
          setBlockedVisible(false);
          void openAppSettings();
        }}
      />
    </ScreenContainer>
  );
}
