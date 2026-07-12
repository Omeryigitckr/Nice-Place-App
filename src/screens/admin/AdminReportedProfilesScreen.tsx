import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CachedImage, EmptyState, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAdminAccess } from '../../hooks';
import { adminListReportedProfiles } from '../../services/profileModerationService';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import type { ReportedProfileListItem } from '../../types/profileModeration';
import { ProfileStackParamList } from '../../types';
import {
  formatAdminDateTime,
  getProfileReportReasonLabel,
  localizeAdminMessage,
} from '../../utils/adminMessages';

type Props = NativeStackScreenProps<
  ProfileStackParamList,
  typeof PROFILE_ROUTES.ADMIN_REPORTED_PROFILES
>;

function topReasons(
  counts: Record<string, number>,
  formatReason: (label: string, count: number) => string,
): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([reason, count]) => {
      const label = getProfileReportReasonLabel(reason);
      return formatReason(label, count);
    })
    .join(' · ');
}

export function AdminReportedProfilesScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [profiles, setProfiles] = useState<ReportedProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await adminListReportedProfiles();
    setProfiles(result.profiles);
    setError(result.error ?? null);
    setLoading(false);
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      if (!adminLoading && isAdmin) {
        void load();
      }
    }, [adminLoading, isAdmin, load]),
  );

  const renderItem: ListRenderItem<ReportedProfileListItem> = useCallback(
    ({ item }) => (
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...shadows.sm,
          },
        ]}
        onPress={() =>
          navigation.navigate(PROFILE_ROUTES.ADMIN_REPORTED_PROFILE_DETAIL, {
            reportedUserId: item.reported_user_id,
          })
        }
      >
        {item.avatar_url ? (
          <CachedImage uri={item.avatar_url} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]} />
        )}
        <View style={styles.body}>
          <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
            @{item.username || t('admin.unknownUser')}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {t('admin.reports.counts', {
              open: item.open_report_count,
              total: item.total_report_count,
            })}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
            {topReasons(item.open_reason_counts, (label, count) =>
              t('admin.reports.reasonWithCount', { label, count }),
            ) || t('admin.reports.noReasonSummary')}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {t('admin.reports.lastReport', {
              date: formatAdminDateTime(item.last_report_at, i18n.language),
            })}
          </Text>
          <View style={styles.badges}>
            {item.is_suspended ? (
              <Text style={[styles.badge, { color: colors.error }]}>
                {t('admin.reports.suspended')}
              </Text>
            ) : null}
            {item.moderation_strikes > 0 ? (
              <Text style={[styles.badge, { color: colors.warning }]}>
                {t('admin.reports.strikes', { count: item.moderation_strikes })}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    ),
    [colors, i18n.language, navigation, shadows.sm, t],
  );

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar>
        <EmptyState
          icon="lock-closed-outline"
          title={t('admin.access.deniedTitle')}
          description={t('admin.access.deniedBody')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer safeTop={false} reserveFloatingTabBar padded={false} contentStyle={styles.root}>
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>
          {localizeAdminMessage(error) ?? error}
        </Text>
      ) : null}

      {loading && profiles.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={i18n.language}
          data={profiles}
          keyExtractor={(item) => item.reported_user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void load()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title={t('admin.reports.emptyTitle')}
              description={t('admin.reports.emptyBody')}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...typography.caption,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  username: {
    ...typography.label,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    ...typography.caption,
    fontWeight: '700',
  },
});
