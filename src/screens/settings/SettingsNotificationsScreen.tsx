import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { devLog } from '../../utils/devLog';

import { ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAppSettings } from '../../hooks';
import {
  notificationStatusLabel,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '../../services/notificationSettingsService';
import { ProfileStackParamList } from '../../types';
import { PreferenceToggle, SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_NOTIFICATIONS>;

export function SettingsNotificationsScreen(_props: Props) {
  const { settings, loading, updateSettings } = useAppSettings();
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');

  useEffect(() => {
    const anyEnabled =
      settings.notifications.updateRequestStatus ||
      settings.notifications.newNearbyPlaces ||
      settings.notifications.savedPlaceReminders;
    setPermissionStatus(anyEnabled ? 'enabled' : 'disabled');
  }, [settings.notifications]);

  const handleToggle = async (
    key: keyof typeof settings.notifications,
    value: boolean,
  ) => {
    if (value) {
      const status = await requestNotificationPermission();
      setPermissionStatus(status === 'denied' ? 'denied' : 'enabled');
    } else {
      const next = { ...settings.notifications, [key]: false };
      const stillEnabled =
        next.updateRequestStatus || next.newNearbyPlaces || next.savedPlaceReminders;
      setPermissionStatus(stillEnabled ? 'enabled' : 'disabled');
    }

    await updateSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));

    devLog('[Nice Place Notifications] setting changed:', key, value);
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title="Notifications" entranceIndex={0}>
        <Text style={settingsStyles.statusLabel}>
          Status: {notificationStatusLabel(permissionStatus)}
        </Text>
        <PreferenceToggle
          label="Update request status notifications"
          value={settings.notifications.updateRequestStatus}
          disabled={loading}
          onValueChange={(value) => void handleToggle('updateRequestStatus', value)}
        />
        <PreferenceToggle
          label="New nearby places notifications"
          value={settings.notifications.newNearbyPlaces}
          disabled={loading}
          onValueChange={(value) => void handleToggle('newNearbyPlaces', value)}
        />
        <PreferenceToggle
          label="Saved place reminders"
          value={settings.notifications.savedPlaceReminders}
          disabled={loading}
          onValueChange={(value) => void handleToggle('savedPlaceReminders', value)}
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
