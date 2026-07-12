import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { AppButton, AuthScreenLayout, AuthStaggerItem } from '../components';
import { AUTH_ROUTES } from '../constants';
import { isAuthCallbackUrl, processAuthCallbackUrl } from '../services';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import { takeAuthCallbackUrl } from '../navigation/authCallbackBridge';
import { routeAuthCallbackResult } from '../navigation/routeAuthCallbackResult';
import { getLocalizedAuthError } from '../utils/authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.AUTH_CALLBACK>;

export function AuthCallbackScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const verifyLink = async () => {
      const stashedUrl = takeAuthCallbackUrl();
      const initialUrl = stashedUrl ?? (await Linking.getInitialURL());
      const url = initialUrl && isAuthCallbackUrl(initialUrl) ? initialUrl : null;

      if (!url) {
        if (mounted) {
          setError(getLocalizedAuthError('auth.errors.linkInvalid', 'auth.errors.verifyFailed'));
        }
        return;
      }

      const result = await processAuthCallbackUrl(url);
      if (!mounted) {
        return;
      }

      if (!result.success) {
        setError(getLocalizedAuthError(result.error, 'auth.errors.verifyFailed'));
        return;
      }

      if (result.flow === 'recovery') {
        navigation.replace(AUTH_ROUTES.RESET_PASSWORD);
        return;
      }

      routeAuthCallbackResult(result);
    };

    void verifyLink();

    return () => {
      mounted = false;
    };
  }, [navigation]);

  return (
    <AuthScreenLayout>
      <View style={styles.content}>
        {error ? (
          <>
            <AuthStaggerItem index={0}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('auth.callback.failedTitle')}
              </Text>
            </AuthStaggerItem>
            <AuthStaggerItem index={1}>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{error}</Text>
            </AuthStaggerItem>
            <AuthStaggerItem index={2}>
              <AppButton
                title={t('auth.callback.backToSignIn')}
                onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
              />
            </AuthStaggerItem>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {t('auth.callback.verifying')}
            </Text>
          </>
        )}
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
