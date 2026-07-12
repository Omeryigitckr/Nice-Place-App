import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton, ScreenContainer } from '../components';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../services';
import { resetNotificationsMemory } from '../hooks/useNotifications';
import { resetPlaceLikesMemory } from '../hooks/usePlaceLikes';
import { resetSavedPlacesMemory } from '../hooks/useSavedPlaces';
import { spacing, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';

interface AccountSuspendedScreenProps {
  reason?: string | null;
  until?: string | null;
}

function formatUntil(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AccountSuspendedScreen({ reason, until }: AccountSuspendedScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { user, profile, refresh } = useAuth();
  const untilLabel = formatUntil(until);

  const handleSignOut = async () => {
    await signOut({
      profileId: profile?.id ?? null,
      authUserId: user?.id ?? null,
    });
    resetPlaceLikesMemory();
    resetSavedPlacesMemory();
    resetNotificationsMemory();
    await refresh();
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('profile.moderation.suspended.title')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('profile.moderation.suspended.body')}
      </Text>

      {reason ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {t('profile.moderation.suspended.reason')}
          </Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{reason}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t('profile.moderation.suspended.duration')}
        </Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {untilLabel
            ? t('profile.moderation.suspended.until', { date: untilLabel })
            : t('profile.moderation.suspended.indefinite')}
        </Text>
      </View>

      <Text style={[styles.help, { color: colors.textMuted }]}>
        {t('profile.moderation.suspended.help')}
      </Text>

      <AppButton
        title={t('profile.moderation.suspended.signOut')}
        variant="secondary"
        onPress={() => void handleSignOut()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 26,
    fontWeight: '700',
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  help: {
    ...typography.caption,
    lineHeight: 18,
  },
});
