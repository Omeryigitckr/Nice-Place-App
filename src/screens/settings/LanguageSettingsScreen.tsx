import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  useAppLanguage,
} from '../../i18n';
import { radius, spacing, typography } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';
import { ProfileStackParamList } from '../../types';
import { SettingsSection, settingsStyles } from './settingsShared';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.SETTINGS_LANGUAGE
>;

export function LanguageSettingsScreen(_props: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { language, changeLanguage } = useAppLanguage();
  const [pending, setPending] = useState<SupportedLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const handleSelect = useCallback(
    async (code: SupportedLanguage) => {
      if (code === language || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      setPending(code);
      setError(null);

      try {
        await changeLanguage(code);
      } catch {
        setError(t('settings.language.saveFailed'));
      } finally {
        inFlightRef.current = false;
        setPending(null);
      }
    },
    [changeLanguage, language, t],
  );

  return (
    <ScreenContainer
      scrollable
      safeTop={false}
      reserveFloatingTabBar
      contentStyle={settingsStyles.content}
    >
      <SettingsSection title={t('settings.language.select')} entranceIndex={0}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          {t('settings.language.description')}
        </Text>

        <View style={styles.list}>
          {SUPPORTED_LANGUAGES.map((item) => {
            const selected = item.code === language;
            const isSaving = pending === item.code;

            return (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: pending != null }}
                disabled={pending != null}
                onPress={() => {
                  void handleSelect(item.code);
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: selected ? colors.chipActiveBackground : 'transparent',
                    borderColor: selected ? colors.primaryBorder : colors.border,
                    opacity: pressed && pending == null ? 0.92 : 1,
                  },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.nativeName, { color: colors.textPrimary }]}>
                    {item.nativeName}
                  </Text>
                  {item.englishName !== item.nativeName ? (
                    <Text style={[styles.englishName, { color: colors.textMuted }]}>
                      {item.englishName}
                    </Text>
                  ) : null}
                </View>

                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: colors.border,
                      },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : null}
      </SettingsSection>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  nativeName: {
    ...typography.label,
    fontWeight: '700',
  },
  englishName: {
    ...typography.caption,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
