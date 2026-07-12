import { Ionicons } from '@expo/vector-icons';
import { BellRing } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CachedImage, EmptyState, ScreenContainer } from '../../components';
import { PROFILE_ROUTES } from '../../constants';
import { useAdminAccess } from '../../hooks';
import {
  getPendingPlaces,
  getPendingPlaceUpdateRequests,
  getRejectedPlaces,
  getRejectedPlaceUpdateRequests,
  adminListReportedProfiles,
} from '../../services';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { DbPlace, DbPlaceUpdateRequest } from '../../types/database';
import { ProfileStackParamList } from '../../types';
import {
  formatAdminDateTime,
  getPlaceStatusLabel,
  isAdminAccessGateMessage,
  localizeAdminMessage,
} from '../../utils/adminMessages';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.ADMIN_PANEL>;

type QueueFilter = 'pending' | 'rejected';
type AdminTab = 'places' | 'updates';

export function AdminPanelScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();

  const [queueFilter, setQueueFilter] = useState<QueueFilter>('pending');
  const [tab, setTab] = useState<AdminTab>('places');
  const [pendingPlaces, setPendingPlaces] = useState<DbPlace[]>([]);
  const [rejectedPlaces, setRejectedPlaces] = useState<DbPlace[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DbPlaceUpdateRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<DbPlaceUpdateRequest[]>([]);
  const [openReportedProfiles, setOpenReportedProfiles] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (adminLoading || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    const [
      pendingPlacesResult,
      rejectedPlacesResult,
      pendingRequestsResult,
      rejectedRequestsResult,
      reportedProfilesResult,
    ] = await Promise.all([
      getPendingPlaces(),
      getRejectedPlaces(),
      getPendingPlaceUpdateRequests(),
      getRejectedPlaceUpdateRequests(),
      adminListReportedProfiles(),
    ]);

    setPendingPlaces(pendingPlacesResult.places);
    setRejectedPlaces(rejectedPlacesResult.places);
    setPendingRequests(pendingRequestsResult.requests);
    setRejectedRequests(rejectedRequestsResult.requests);
    setOpenReportedProfiles(
      reportedProfilesResult.profiles.filter((item) => item.open_report_count > 0).length,
    );

    const dataError = [
      pendingPlacesResult.error,
      rejectedPlacesResult.error,
      pendingRequestsResult.error,
      rejectedRequestsResult.error,
      reportedProfilesResult.error,
    ].find((message) => message && !isAdminAccessGateMessage(message));
    setError(dataError ?? null);
    setLoading(false);
  }, [adminLoading, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      if (!adminLoading && isAdmin) {
        void loadData();
      }
    }, [adminLoading, isAdmin, loadData]),
  );

  const places = queueFilter === 'pending' ? pendingPlaces : rejectedPlaces;
  const requests = queueFilter === 'pending' ? pendingRequests : rejectedRequests;
  const statusLabel = getPlaceStatusLabel(queueFilter);

  const placeKeyExtractor = useCallback((item: DbPlace) => item.id, []);
  const requestKeyExtractor = useCallback((item: DbPlaceUpdateRequest) => item.id, []);

  const renderPlace: ListRenderItem<DbPlace> = useCallback(
    ({ item }) => {
      const title = item.title?.trim() || t('admin.untitledPlace');
      return (
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
            navigation.navigate(PROFILE_ROUTES.ADMIN_PLACE_DETAIL, { placeId: item.id })
          }
          accessibilityRole="button"
          accessibilityLabel={t('admin.panel.a11yReviewPlace', { title })}
        >
          <CachedImage
            uri={item.cover_photo_url}
            width={64}
            height={64}
            borderRadius={radius.md}
            recyclingKey={item.id}
            priority="low"
          />
          <View style={styles.cardBody}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.category} · {statusLabel}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatAdminDateTime(item.created_at, i18n.language)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      );
    },
    [colors, i18n.language, navigation, shadows.sm, statusLabel, t],
  );

  const renderRequest: ListRenderItem<DbPlaceUpdateRequest> = useCallback(
    ({ item }) => {
      const title = item.title?.trim() || t('admin.untitledPlace');
      const category = item.category ?? t('admin.uncategorized');
      return (
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
            navigation.navigate(PROFILE_ROUTES.ADMIN_UPDATE_REQUEST, {
              requestId: item.id,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={t('admin.panel.a11yReviewUpdate', { title })}
        >
          <CachedImage
            uri={item.cover_photo_url}
            width={64}
            height={64}
            borderRadius={radius.md}
            recyclingKey={item.id}
            priority="low"
          />
          <View style={styles.cardBody}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {`${category} · ${t('admin.panel.metaUpdate')} · ${statusLabel}`}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatAdminDateTime(item.created_at, i18n.language)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      );
    },
    [colors, i18n.language, navigation, shadows.sm, statusLabel, t],
  );

  const queueFilters = useMemo(
    () =>
      [
        {
          key: 'pending' as const,
          label: t('admin.panel.filterPending'),
          count: pendingPlaces.length + pendingRequests.length,
        },
        {
          key: 'rejected' as const,
          label: t('admin.panel.filterRejected'),
          count: rejectedPlaces.length + rejectedRequests.length,
        },
      ] as const,
    [
      i18n.language,
      pendingPlaces.length,
      pendingRequests.length,
      rejectedPlaces.length,
      rejectedRequests.length,
      t,
    ],
  );

  const tabs = useMemo(
    () =>
      [
        { key: 'places' as const, label: t('admin.panel.tabPlaces'), count: places.length },
        { key: 'updates' as const, label: t('admin.panel.tabUpdates'), count: requests.length },
      ] as const,
    [i18n.language, places.length, requests.length, t],
  );

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('admin.checkingAccess')}
        </Text>
      </ScreenContainer>
    );
  }

  if (!authUserId) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="person-outline"
          title={t('admin.access.signInTitle')}
          description={t('admin.access.signInBody')}
        />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="lock-closed-outline"
          title={t('admin.access.deniedTitle')}
          description={t('admin.access.deniedBody')}
        />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('admin.loadingQueue')}
        </Text>
      </ScreenContainer>
    );
  }

  const listEmpty =
    tab === 'places' ? (
      <EmptyState
        icon="checkmark-circle-outline"
        title={
          queueFilter === 'pending'
            ? t('admin.panel.emptyPendingPlacesTitle')
            : t('admin.panel.emptyRejectedPlacesTitle')
        }
        description={
          queueFilter === 'pending'
            ? t('admin.panel.emptyPendingPlacesBody')
            : t('admin.panel.emptyRejectedPlacesBody')
        }
      />
    ) : (
      <EmptyState
        icon="checkmark-circle-outline"
        title={
          queueFilter === 'pending'
            ? t('admin.panel.emptyPendingUpdatesTitle')
            : t('admin.panel.emptyRejectedUpdatesTitle')
        }
        description={
          queueFilter === 'pending'
            ? t('admin.panel.emptyPendingUpdatesBody')
            : t('admin.panel.emptyRejectedUpdatesBody')
        }
      />
    );

  return (
    <ScreenContainer safeTop={false} reserveFloatingTabBar padded={false} contentStyle={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('admin.panel.subtitle')}
        </Text>
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {localizeAdminMessage(error) ?? error}
          </Text>
        ) : null}
      </View>

      <Pressable
        style={[
          styles.toolCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...shadows.sm,
          },
        ]}
        onPress={() => navigation.navigate(PROFILE_ROUTES.ADMIN_NOTIFICATION_BROADCAST)}
        accessibilityRole="button"
      >
        <View style={[styles.toolIconWrap, { backgroundColor: colors.primaryLight }]}>
          <BellRing size={20} color={colors.primary} />
        </View>
        <View style={styles.toolCopy}>
          <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>
            {t('admin.panel.sendNotification')}
          </Text>
          <Text style={[styles.toolSubtitle, { color: colors.textMuted }]}>
            {t('admin.panel.sendNotificationSubtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable
        style={[
          styles.toolCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...shadows.sm,
          },
        ]}
        onPress={() => navigation.navigate(PROFILE_ROUTES.ADMIN_REPORTED_PROFILES)}
        accessibilityRole="button"
      >
        <View style={[styles.toolIconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="flag-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.toolCopy}>
          <View style={styles.toolTitleRow}>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>
              {t('admin.panel.reportedProfiles')}
            </Text>
            {openReportedProfiles > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>
                  {openReportedProfiles > 99 ? '99+' : String(openReportedProfiles)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.toolSubtitle, { color: colors.textMuted }]}>
            {t('admin.panel.reportedProfilesSubtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.tabs}>
        {queueFilters.map((item) => {
          const active = queueFilter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setQueueFilter(item.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? colors.primaryLight : colors.surfaceSecondary,
                  borderColor: active ? colors.primaryBorder : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.white }]}>{item.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tabs}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? colors.primaryLight : colors.surfaceSecondary,
                  borderColor: active ? colors.primaryBorder : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.white }]}>{item.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {tab === 'places' ? (
        <FlatList
          data={places}
          keyExtractor={placeKeyExtractor}
          renderItem={renderPlace}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={requestKeyExtractor}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
  },
  errorText: {
    ...typography.caption,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tabLabel: {
    ...typography.label,
    fontWeight: '600',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  toolIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: {
    flex: 1,
    gap: 2,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolTitle: {
    ...typography.label,
    fontWeight: '700',
  },
  toolSubtitle: {
    ...typography.caption,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.title,
  },
  meta: {
    ...typography.caption,
  },
});
