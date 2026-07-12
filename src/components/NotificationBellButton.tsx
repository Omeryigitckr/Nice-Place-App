import { Bell } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, spacing } from '../theme';
import { iconSizes } from '../theme/icons';
import { useTheme } from '../theme/ThemeContext';

interface NotificationBellButtonProps {
  unreadCount: number;
  onPress: () => void;
}

export function NotificationBellButton({ unreadCount, onPress }: NotificationBellButtonProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const showBadge = unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? '99+' : `${unreadCount}`;

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        showBadge
          ? t('notifications.a11yUnread', { count: unreadCount })
          : t('notifications.a11y')
      }
      accessibilityHint={t('notifications.a11yOpen')}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...shadows.sm,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Bell size={iconSizes.sm} color={colors.textPrimary} strokeWidth={2.2} />
      {showBadge ? (
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
          <Text style={[styles.badgeText, { color: colors.white }]}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
