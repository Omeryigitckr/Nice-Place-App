import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAppSettings } from '../../hooks';
import { ProfileStackParamList } from '../../types';
import { ThemeMode } from '../../services/settingsService';
import { useThemeColors } from '../../theme/ThemeContext';
import {
  SettingsSection,
  SettingsSegmentedControl,
  settingsStyles,
} from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_APPEARANCE>;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function SettingsAppearanceScreen(_props: Props) {
  const colors = useThemeColors();
  const { settings, updateSettings } = useAppSettings();

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title="Theme" entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          Preference is saved on this device. Status bar updates immediately; full light UI is limited for now.
        </Text>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>Appearance</Text>
        <SettingsSegmentedControl
          options={THEME_OPTIONS}
          value={settings.themeMode}
          onChange={(value) =>
            void updateSettings((current) => ({ ...current, themeMode: value }))
          }
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
