import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
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
} from '../../services';
import { radius, spacing, typography } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { DbPlace, DbPlaceUpdateRequest } from '../../types/database';
import { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.ADMIN_PANEL>;

type QueueFilter = 'pending' | 'rejected';
type AdminTab = 'places' | 'updates';

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AdminPanelScreen({ navigation }: Props) {
  const { colors, shadows } = useTheme();
  const { isAdmin, loading: adminLoading, authUserId } = useAdminAccess();

  const [queueFilter, setQueueFilter] = useState<QueueFilter>('pending');
  const [tab, setTab] = useState<AdminTab>('places');
  const [pendingPlaces, setPendingPlaces] = useState<DbPlace[]>([]);
  const [rejectedPlaces, setRejectedPlaces] = useState<DbPlace[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DbPlaceUpdateRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<DbPlaceUpdateRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (adminLoading || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    const [pendingPlacesResult, rejectedPlacesResult, pendingRequestsResult, rejectedRequestsResult] =
      await Promise.all([
        getPendingPlaces(),
        getRejectedPlaces(),
        getPendingPlaceUpdateRequests(),
        getRejectedPlaceUpdateRequests(),
      ]);

    setPendingPlaces(pendingPlacesResult.places);
    setRejectedPlaces(rejectedPlacesResult.places);
    setPendingRequests(pendingRequestsResult.requests);
    setRejectedRequests(rejectedRequestsResult.requests);

    const dataError = [
      pendingPlacesResult.error,
      rejectedPlacesResult.error,
      pendingRequestsResult.error,
      rejectedRequestsResult.error,
    ].find(
      (message) =>
        message &&
        !message.toLowerCase().includes('admin access') &&
        !message.toLowerCase().includes('sign in as an admin'),
    );
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
  const statusLabel = queueFilter === 'pending' ? 'pending' : 'rejected';

  const placeKeyExtractor = useCallback((item: DbPlace) => item.id, []);
  const requestKeyExtractor = useCallback((item: DbPlaceUpdateRequest) => item.id, []);

  const renderPlace: ListRenderItem<DbPlace> = useCallback(
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
          navigation.navigate(PROFILE_ROUTES.ADMIN_PLACE_DETAIL, { placeId: item.id })
        }
        accessibilityRole="button"
        accessibilityLabel={`Review place ${item.title}`}
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
            {item.title?.trim() || 'Untitled place'}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.category} · {statusLabel}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    ),
    [colors, navigation, shadows.sm, statusLabel],
  );

  const renderRequest: ListRenderItem<DbPlaceUpdateRequest> = useCallback(
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
          navigation.navigate(PROFILE_ROUTES.ADMIN_UPDATE_REQUEST, {
            requestId: item.id,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Review update for ${item.title ?? 'place'}`}
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
            {item.title?.trim() || 'Untitled place'}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.category ?? 'uncategorized'} · update · {statusLabel}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    ),
    [colors, navigation, shadows.sm, statusLabel],
  );

  const queueFilters = useMemo(
    () =>
      [
        {
          key: 'pending' as const,
          label: 'Pending',
          count: pendingPlaces.length + pendingRequests.length,
        },
        {
          key: 'rejected' as const,
          label: 'Rejected',
          count: rejectedPlaces.length + rejectedRequests.length,
        },
      ] as const,
    [
      pendingPlaces.length,
      pendingRequests.length,
      rejectedPlaces.length,
      rejectedRequests.length,
    ],
  );

  const tabs = useMemo(
    () =>
      [
        { key: 'places' as const, label: 'Places', count: places.length },
        { key: 'updates' as const, label: 'Updates', count: requests.length },
      ] as const,
    [places.length, requests.length],
  );

  if (adminLoading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking admin access…
        </Text>
      </ScreenContainer>
    );
  }

  if (!authUserId) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          description="Guests cannot access the admin panel. Sign in with an admin account."
        />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <EmptyState
          icon="lock-closed-outline"
          title="Access denied"
          description="This panel is only available to administrators."
        />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer safeTop={false} reserveFloatingTabBar contentStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading admin queue…
        </Text>
      </ScreenContainer>
    );
  }

  const listEmpty =
    tab === 'places' ? (
      <EmptyState
        icon="checkmark-circle-outline"
        title={queueFilter === 'pending' ? 'No pending places' : 'No rejected places'}
        description={
          queueFilter === 'pending'
            ? 'New place submissions will show up here for approval.'
            : 'Rejected places can be restored to pending from here.'
        }
      />
    ) : (
      <EmptyState
        icon="checkmark-circle-outline"
        title={queueFilter === 'pending' ? 'No pending updates' : 'No rejected updates'}
        description={
          queueFilter === 'pending'
            ? 'Place edit requests will show up here for review.'
            : 'Rejected update requests can be restored to pending from here.'
        }
      />
    );

  return (
    <ScreenContainer safeTop={false} reserveFloatingTabBar padded={false} contentStyle={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Review submissions before they go public.
        </Text>
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}
      </View>

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
