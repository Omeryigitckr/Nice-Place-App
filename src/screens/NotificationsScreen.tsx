import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton, EmptyState, ScreenContainer, SectionHeader } from '../components';
import { MAP_ROUTES } from '../constants';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { navigateFromNotificationData } from '../navigation/notificationNavigation';
import { radius, spacing, touchTarget, typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import type { AppNotification } from '../types/notification';
import { MapStackParamList } from '../types';
import { formatNotificationForDisplay } from '../utils/notificationDisplay';
import { formatNotificationTime } from '../utils/notificationTime';

type Props = NativeStackScreenProps<MapStackParamList, typeof MAP_ROUTES.NOTIFICATIONS>;

const keyExtractor = (item: AppNotification) => item.id;

export function NotificationsScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { notifications, unreadCount, loading, ready, refresh, markRead, markAllRead } =
    useNotifications(profile?.id);

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: true });
    }, [refresh]),
  );

  const handlePress = useCallback(
    (item: AppNotification) => {
      if (!item.isRead) {
        void markRead(item.id);
      }
      if (item.data?.placeId) {
        navigateFromNotificationData(item.data as Record<string, unknown>);
        return;
      }
      if (item.type === NOTIFICATION_TYPES.SYSTEM || item.type === NOTIFICATION_TYPES.EVENT) {
        return;
      }
    },
    [markRead],
  );

  const subtitle = useMemo(
    () =>
      unreadCount > 0
        ? t('notifications.subtitleUnread', { count: unreadCount })
        : t('notifications.subtitleCaughtUp'),
    [i18n.language, t, unreadCount],
  );

  const renderItem: ListRenderItem<AppNotification> = useCallback(
    ({ item }) => {
      const copy = formatNotificationForDisplay(item);
      const when = formatNotificationTime(item.createdAt, i18n.language);
      const stateLabel = item.isRead
        ? t('notifications.a11yReadItem')
        : t('notifications.a11yUnreadItem');

      return (
        <Pressable
          onPress={() => handlePress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${stateLabel}. ${copy.title}. ${copy.body}. ${when}`}
          accessibilityHint={t('notifications.a11yOpen')}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: item.isRead ? colors.card : colors.primaryLight,
              borderColor: item.isRead ? colors.border : colors.primaryBorder,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {copy.title}
            </Text>
            {!item.isRead ? (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            ) : null}
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{copy.body}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{when}</Text>
        </Pressable>
      );
    },
    [colors, handlePress, i18n.language, t],
  );

  return (
    <ScreenContainer
      scrollable={false}
      safeTop
      reserveFloatingTabBar
      contentStyle={styles.root}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={touchTarget.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.a11yBack')}
          style={styles.backHit}
        >
          <Text style={[styles.back, { color: colors.primary }]}>{t('common.back')}</Text>
        </Pressable>
        {unreadCount > 0 ? (
          <AppButton
            title={t('notifications.markAllRead')}
            variant="secondary"
            size="sm"
            onPress={() => void markAllRead()}
            fullWidth={false}
          />
        ) : null}
      </View>

      <SectionHeader title={t('notifications.title')} subtitle={subtitle} />

      <FlatList
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={`${i18n.language}:${unreadCount}`}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={loading && ready}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !ready || loading ? null : (
            <EmptyState
              icon="notifications-outline"
              title={t('notifications.empty.title')}
              description={t('notifications.empty.description')}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backHit: {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    justifyContent: 'center',
  },
  back: {
    ...typography.label,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  time: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
