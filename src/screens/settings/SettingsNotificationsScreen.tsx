import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { PermissionBlockedModal, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import {
  NOTIFICATION_PREFERENCE_LABEL_KEYS,
  type NotificationPreferenceKey,
} from '../../constants/notificationTypes';
import { showAppToast } from '../../feedback';
import { useAuth } from '../../hooks/useAuth';
import { useAppPermissions } from '../../hooks/useAppPermissions';
import { useNotifications } from '../../hooks/useNotifications';
import { getLastRegisteredPushToken } from '../../providers/PushNotificationsProvider';
import {
  deactivatePushToken,
  ensureNotificationPermissionForFeature,
  getExpoPushTokenIfPermitted,
  getNotificationPreferences,
  savePushToken,
} from '../../services/notificationService';
import { getNotificationPermissionStatus } from '../../services/appPermissionsService';
import { useThemeColors } from '../../theme/ThemeContext';
import { ProfileStackParamList } from '../../types';
import {
  getPermissionStatusLabel,
  localizeSettingsMessage,
} from '../../utils/settingsMessages';
import { PreferenceToggle, SettingsSection, settingsStyles } from './settingsShared';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_NOTIFICATIONS>;

const PREFERENCE_KEYS: NotificationPreferenceKey[] = [
  'placeApproved',
  'placeRejected',
  'placeUpdateApproved',
  'placeUpdateRejected',
  'placeLiked',
  'systemAnnouncements',
  'eventsNews',
];

export function SettingsNotificationsScreen(_props: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { preferences, updatePreferences, refresh: refreshPreferences } = useNotifications(profile?.id);
  const { notification, refresh: refreshPermissions, openAppSettings } = useAppPermissions();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [hasRegisteredToken, setHasRegisteredToken] = useState(false);
  const [blockedModalVisible, setBlockedModalVisible] = useState(false);

  const syncTokenState = useCallback(async () => {
    const token = getLastRegisteredPushToken() ?? (await getExpoPushTokenIfPermitted());
    setHasRegisteredToken(Boolean(token));
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshPermissions(), refreshPreferences(), syncTokenState()]);
  }, [refreshPermissions, refreshPreferences, syncTokenState]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !profile?.id) {
        return;
      }

      void (async () => {
        await refreshPermissions();
        const permission = await getNotificationPermissionStatus();
        const prefs = await getNotificationPreferences(profile.id);
        if (permission.state === 'granted' && prefs.pushEnabled) {
          const token = await getExpoPushTokenIfPermitted();
          if (token) {
            const deviceId =
              Platform.OS === 'android'
                ? Application.getAndroidId?.() ?? null
                : await Application.getIosIdForVendorAsync?.().catch(() => null);
            await savePushToken(profile.id, token, deviceId);
            setHasRegisteredToken(true);
          }
        }
      })();
    });

    return () => subscription.remove();
  }, [profile?.id, refreshPermissions]);

  const deliveryReady = useMemo(
    () =>
      notification.state === 'granted' &&
      preferences.pushEnabled &&
      hasRegisteredToken,
    [hasRegisteredToken, notification.state, preferences.pushEnabled],
  );

  const masterSwitchValue = deliveryReady;
  const notificationsUnavailable = notification.state !== 'granted';

  const permissionSubtitle = useMemo(() => {
    if (notification.state === 'granted') {
      return deliveryReady
        ? t('settings.notifications.statusEnabled')
        : t('settings.notifications.statusFinishing');
    }
    if (notification.state === 'blocked') {
      return t('settings.notifications.statusBlocked');
    }
    if (notification.state === 'denied') {
      return t('settings.notifications.statusDenied');
    }
    return t('settings.notifications.statusDevice', {
      status: getPermissionStatusLabel(notification.state),
    });
  }, [deliveryReady, notification.state, t]);

  const registerTokenForProfile = useCallback(async (): Promise<boolean> => {
    if (!profile?.id) {
      return false;
    }

    const token = await getExpoPushTokenIfPermitted();
    if (!token) {
      return false;
    }

    const deviceId =
      Platform.OS === 'android'
        ? Application.getAndroidId?.() ?? null
        : await Application.getIosIdForVendorAsync?.().catch(() => null);

    const result = await savePushToken(profile.id, token, deviceId);
    if (!result.success) {
      showAppToast(
        localizeSettingsMessage(result.error) ?? t('settings.notifications.registerFailed'),
        { tone: 'error' },
      );
      return false;
    }

    setHasRegisteredToken(true);
    return true;
  }, [profile?.id, t]);

  const handleMasterChange = async (value: boolean) => {
    if (!profile?.id || savingKey) {
      return;
    }

    setSavingKey('pushEnabled');

    if (!value) {
      const token = getLastRegisteredPushToken();
      if (token) {
        await deactivatePushToken(profile.id, token);
      }
      await updatePreferences({ pushEnabled: false });
      setHasRegisteredToken(false);
      setSavingKey(null);
      return;
    }

    const permission = await ensureNotificationPermissionForFeature();
    await refreshPermissions();

    if (permission.shouldOpenSettings) {
      setBlockedModalVisible(true);
      setSavingKey(null);
      return;
    }

    if (!permission.granted) {
      setSavingKey(null);
      return;
    }

    const registered = await registerTokenForProfile();
    if (!registered) {
      showAppToast(t('settings.notifications.registerDeviceFailed'), { tone: 'error' });
      setSavingKey(null);
      return;
    }

    const result = await updatePreferences({ pushEnabled: true });
    if (!result.success) {
      showAppToast(
        localizeSettingsMessage(result.error) ?? t('settings.notifications.saveFailed'),
        { tone: 'error' },
      );
    }

    setSavingKey(null);
  };

  const handlePreferenceChange = async (key: NotificationPreferenceKey, value: boolean) => {
    if (!profile?.id) {
      return;
    }
    setSavingKey(key);
    await updatePreferences({ [key]: value });
    setSavingKey(null);
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title={t('settings.sections.notifications')} entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          {t('settings.notifications.helper')}
        </Text>
        <Text style={[settingsStyles.statusLabel, { color: colors.textSecondary }]}>
          {permissionSubtitle}
        </Text>

        <PreferenceToggle
          label={t('settings.notifications.enable')}
          value={masterSwitchValue}
          disabled={savingKey === 'pushEnabled'}
          onValueChange={(nextValue) => {
            void handleMasterChange(nextValue);
          }}
        />

        {PREFERENCE_KEYS.map((key) => (
          <View key={key} style={styles.prefRow}>
            <PreferenceToggle
              label={t(NOTIFICATION_PREFERENCE_LABEL_KEYS[key] as never)}
              value={preferences[key]}
              disabled={notificationsUnavailable || savingKey === key}
              onValueChange={(value) => {
                void handlePreferenceChange(key, value);
              }}
            />
            {savingKey === key ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.saving} />
            ) : null}
          </View>
        ))}
      </SettingsSection>

      <PermissionBlockedModal
        visible={blockedModalVisible}
        title={t('settings.notifications.blockedTitle')}
        message={t('settings.notifications.blockedMessage')}
        onCancel={() => setBlockedModalVisible(false)}
        onOpenSettings={() => {
          setBlockedModalVisible(false);
          void openAppSettings();
        }}
      />
    </ScreenContainer>
  );
}

const styles = {
  prefRow: {
    position: 'relative' as const,
    opacity: 1,
  },
  saving: {
    position: 'absolute' as const,
    right: 0,
    top: 14,
  },
};
