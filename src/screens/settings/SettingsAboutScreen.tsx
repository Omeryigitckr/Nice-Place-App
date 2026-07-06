import { useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LegalInfoModal, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { ProfileStackParamList } from '../../types';
import { LegalInfoContent } from '../../components/LegalInfoModal';
import {
  APP_VERSION,
  LEGAL_CONTENT,
  SettingsLinkRow,
  SettingsSection,
  settingsStyles,
} from './settingsShared';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS_ABOUT>;

export function SettingsAboutScreen(_props: Props) {
  const [legalContent, setLegalContent] = useState<LegalInfoContent | null>(null);

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      <SettingsSection title="About Nice Place" entranceIndex={0}>
        <SettingsLinkRow label="About Nice Place" onPress={() => setLegalContent(LEGAL_CONTENT.about)} />
        <SettingsLinkRow label="Terms of Service" onPress={() => setLegalContent(LEGAL_CONTENT.terms)} />
        <SettingsLinkRow label="Privacy Policy" onPress={() => setLegalContent(LEGAL_CONTENT.privacy)} />
        <SettingsLinkRow label="Report guidelines" onPress={() => setLegalContent(LEGAL_CONTENT.guidelines)} />
        <Text style={settingsStyles.versionLabel}>App version</Text>
        <Text style={settingsStyles.versionValue}>{APP_VERSION}</Text>
      </SettingsSection>

      <LegalInfoModal
        visible={legalContent != null}
        content={legalContent}
        onClose={() => setLegalContent(null)}
      />
    </ScreenContainer>
  );
}
