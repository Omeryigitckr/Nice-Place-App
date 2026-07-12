import { useMemo } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

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

const THEME_OPTIONS: {
  value: ThemeMode;
  labelKey: 'settings.theme.system' | 'settings.theme.dark' | 'settings.theme.light';
}[] = [
  { value: 'system', labelKey: 'settings.theme.system' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
  { value: 'light', labelKey: 'settings.theme.light' },
];

export function SettingsAppearanceScreen(_props: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppSettings();

  const themeSegmentOptions = useMemo(
    () => THEME_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title={t('settings.theme.title')} entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          {t('settings.theme.helper')}
        </Text>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>
          {t('settings.theme.groupLabel')}
        </Text>
        <SettingsSegmentedControl
          options={themeSegmentOptions}
          value={settings.themeMode}
          onChange={(value) =>
            void updateSettings((current) => ({ ...current, themeMode: value }))
          }
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
