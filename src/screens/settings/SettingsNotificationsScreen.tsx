import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useThemeColors } from '../../theme/ThemeContext';
import {
  notificationStatusLabel,
} from '../../services/notificationSettingsService';
import { ProfileStackParamList } from '../../types';
import { PreferenceToggle, SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_NOTIFICATIONS>;

export function SettingsNotificationsScreen(_props: Props) {
  const colors = useThemeColors();

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title="Notifications" entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          Push notifications are coming soon in a future beta update.
        </Text>
        <Text style={[settingsStyles.statusLabel, { color: colors.textSecondary }]}>
          Status: {notificationStatusLabel('disabled')}
        </Text>
        <PreferenceToggle
          label="Update request status notifications"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
        <PreferenceToggle
          label="New nearby places notifications"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
        <PreferenceToggle
          label="Saved place reminders"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
