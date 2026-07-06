import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { LEGAL_CONTENT } from '../screens/settings/settingsShared';
import { typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

import { LegalInfoModal } from './LegalInfoModal';

/**
 * Short privacy note for auth screens — opens the in-app privacy policy.
 */
export function AuthLegalFooter() {
  const { colors } = useTheme();
  const [privacyVisible, setPrivacyVisible] = useState(false);

  return (
    <>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        By continuing, you agree to our{' '}
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => setPrivacyVisible(true)}
          accessibilityRole="link"
        >
          Privacy Policy
        </Text>
        .
      </Text>

      <LegalInfoModal
        visible={privacyVisible}
        content={LEGAL_CONTENT.privacy}
        onClose={() => setPrivacyVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    ...typography.caption,
    fontWeight: '600',
  },
});
