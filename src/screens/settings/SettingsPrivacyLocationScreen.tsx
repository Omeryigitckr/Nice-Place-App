import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton, ScreenContainer, ToastBanner } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { ProfileStackParamList } from '../../types';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_PRIVACY_LOCATION>;

export function SettingsPrivacyLocationScreen(_props: Props) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<Location.PermissionStatus | null>(null);

  const refreshLocationStatus = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationStatus(status);
  }, []);

  useEffect(() => {
    void refreshLocationStatus();
  }, [refreshLocationStatus]);

  const handleRequestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status);

    if (status === Location.PermissionStatus.GRANTED) {
      setToastMessage('Location permission granted.');
      return;
    }

    setToastMessage('Location permission was not granted.');
  };

  const locationStatusLabel = (() => {
    switch (locationStatus) {
      case Location.PermissionStatus.GRANTED:
        return 'Granted';
      case Location.PermissionStatus.DENIED:
        return 'Denied';
      default:
        return 'Not requested';
    }
  })();

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      {toastMessage ? (
        <ToastBanner
          message={toastMessage}
          visible={toastMessage != null}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}

      <SettingsSection title="Location" entranceIndex={0}>
        <Text style={settingsStyles.helperText}>
          Nice Place uses your location to sort nearby places, show distance, and place submissions at your current position.
        </Text>
        <Text style={settingsStyles.statusLabel}>Permission status</Text>
        <Text style={settingsStyles.statusValue}>{locationStatusLabel}</Text>
        <AppButton title="Request permission" variant="secondary" onPress={handleRequestLocation} fullWidth={false} />
        <AppButton
          title="Open device settings"
          variant="ghost"
          onPress={() => void Linking.openSettings()}
          fullWidth={false}
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
