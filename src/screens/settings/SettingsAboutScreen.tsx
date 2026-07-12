import { useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { LegalInfoModal, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { ProfileStackParamList } from '../../types';
import {
  getLegalContent,
  type LegalContentId,
} from '../../utils/settingsMessages';
import {
  APP_VERSION,
  SettingsLinkRow,
  SettingsSection,
  settingsStyles,
} from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_ABOUT>;

export function SettingsAboutScreen(_props: Props) {
  const { t } = useTranslation();
  const [legalContentId, setLegalContentId] = useState<LegalContentId | null>(null);

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title={t('settings.sections.about')} entranceIndex={0}>
        <SettingsLinkRow
          label={t('settings.support.aboutNicePlace')}
          onPress={() => setLegalContentId('about')}
        />
        <SettingsLinkRow
          label={t('settings.support.termsOfService')}
          onPress={() => setLegalContentId('terms')}
        />
        <SettingsLinkRow
          label={t('settings.support.privacyPolicy')}
          onPress={() => setLegalContentId('privacy')}
        />
        <SettingsLinkRow
          label={t('settings.support.reportGuidelines')}
          onPress={() => setLegalContentId('guidelines')}
        />
        <Text style={settingsStyles.versionLabel}>{t('settings.support.appVersion')}</Text>
        <Text style={settingsStyles.versionValue}>{APP_VERSION}</Text>
      </SettingsSection>

      <LegalInfoModal
        visible={legalContentId != null}
        content={legalContentId ? getLegalContent(legalContentId) : null}
        onClose={() => setLegalContentId(null)}
      />
    </ScreenContainer>
  );
}
