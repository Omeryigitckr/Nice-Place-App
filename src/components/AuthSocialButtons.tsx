import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { isAppleSignInAvailable } from '../services/socialAuthService';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface AuthSocialButtonsProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  disabled?: boolean;
  loadingProvider?: 'google' | 'apple' | null;
}

export function AuthOrDivider() {
  const { colors } = useTheme();

  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dividerLabel, { color: colors.textMuted }]}>or</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function AuthSocialButtons({
  onGooglePress,
  onApplePress,
  disabled = false,
  loadingProvider = null,
}: AuthSocialButtonsProps) {
  const { colors } = useTheme();
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let mounted = true;
    void isAppleSignInAvailable().then((available) => {
      if (mounted) {
        setAppleAvailable(available);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const googleLoading = loadingProvider === 'google';
  const appleLoading = loadingProvider === 'apple';
  const isDisabled = disabled || loadingProvider !== null;

  return (
    <View style={styles.stack}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={isDisabled}
        onPress={onGooglePress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isDisabled ? 0.6 : pressed ? 0.92 : 1,
          },
        ]}
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
        )}
        <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </Text>
      </Pressable>

      {appleAvailable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          disabled={isDisabled}
          onPress={onApplePress}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: isDisabled ? 0.6 : pressed ? 0.92 : 1,
            },
          ]}
        >
          {appleLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Ionicons name="logo-apple" size={22} color={colors.textPrimary} />
          )}
          <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>
            {appleLoading ? 'Connecting…' : 'Continue with Apple'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonLabel: {
    ...typography.button,
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    ...typography.caption,
    textTransform: 'lowercase',
  },
});
