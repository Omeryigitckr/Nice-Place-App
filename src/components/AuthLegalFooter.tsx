import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { getLegalContent } from '../utils/settingsMessages';

import { LegalInfoModal } from './LegalInfoModal';

/**
 * Short privacy note for auth screens — opens the in-app privacy policy.
 */
export function AuthLegalFooter() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [privacyVisible, setPrivacyVisible] = useState(false);

  return (
    <>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        {t('auth.legal.prefix')}{' '}
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => setPrivacyVisible(true)}
          accessibilityRole="link"
        >
          {t('auth.legal.privacyPolicy')}
        </Text>
        {t('auth.legal.suffix')}
      </Text>

      <LegalInfoModal
        visible={privacyVisible}
        content={privacyVisible ? getLegalContent('privacy') : null}
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
