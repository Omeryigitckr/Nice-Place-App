import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton, AuthScreenLayout, AuthStaggerItem } from '../components';
import { AUTH_ROUTES } from '../constants';
import { isAuthCallbackUrl, processAuthCallbackUrl } from '../services';
import { spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AuthStackParamList } from '../types';
import { takeAuthCallbackUrl } from '../navigation/authCallbackBridge';
import { routeAuthCallbackResult } from '../navigation/routeAuthCallbackResult';

type Props = NativeStackScreenProps<AuthStackParamList, typeof AUTH_ROUTES.AUTH_CALLBACK>;

export function AuthCallbackScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const verifyLink = async () => {
      const stashedUrl = takeAuthCallbackUrl();
      const initialUrl = stashedUrl ?? (await Linking.getInitialURL());
      const url = initialUrl && isAuthCallbackUrl(initialUrl) ? initialUrl : null;

      if (!url) {
        if (mounted) {
          setError('This verification link is invalid or has expired.');
        }
        return;
      }

      const result = await processAuthCallbackUrl(url);
      if (!mounted) {
        return;
      }

      if (!result.success) {
        setError(result.error ?? 'Could not verify this link. Please try again.');
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
                Link verification failed
              </Text>
            </AuthStaggerItem>
            <AuthStaggerItem index={1}>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{error}</Text>
            </AuthStaggerItem>
            <AuthStaggerItem index={2}>
              <AppButton
                title="Back to sign in"
                onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
              />
            </AuthStaggerItem>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.message, { color: colors.textSecondary }]}>Verifying link…</Text>
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
