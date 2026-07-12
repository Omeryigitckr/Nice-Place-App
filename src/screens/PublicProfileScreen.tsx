import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedStatValue,
  AuthRequiredModal,
  EmptyState,
  PlaceDetailSkeleton,
  PlaceListCard,
  ProfileAvatar,
  ProfileEntranceBlock,
  ProfileGridItem,
  ReportProfileModal,
  ScreenContainer,
} from '../components';
import { MAP_ROUTES } from '../constants';
import { useAuth, usePlaceLikes, useUserLocation } from '../hooks';
import { getApprovedPlacesByCreator, getPublicProfile, getPublicProfileStats } from '../services';
import { radius, spacing, touchTarget, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { MapStackParamList } from '../types';
import { Place } from '../types/place';
import {
  PublicProfileStats,
  PublicProfileSummary,
  getPublicDisplayName,
  getPublicUsernameLabel,
} from '../types/publicProfile';
import { navigateToAuth, requireAuth } from '../utils/authGuard';
import { withPlaceDistances } from '../utils/distance';
import { localizeProfileMessage } from '../utils/profileMessages';

type Props = NativeStackScreenProps<MapStackParamList, typeof MAP_ROUTES.PUBLIC_PROFILE>;

export function PublicProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { profileId } = route.params;
  const { location } = useUserLocation();
  const { user, profile: myProfile } = useAuth();
  const { isLiked, getLikeCount, isToggling, toggleLike } = usePlaceLikes();

  const [profile, setProfile] = useState<PublicProfileSummary | null>(null);
  const [stats, setStats] = useState<PublicProfileStats>({
    sharedApprovedCount: 0,
    likesReceived: 0,
  });
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('explore.auth.like');
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const publicProfile = await getPublicProfile(profileId);

      if (!mounted) {
        return;
      }

      if (!publicProfile) {
        setProfile(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [publicStats, approvedPlaces] = await Promise.all([
        getPublicProfileStats(publicProfile.id),
        getApprovedPlacesByCreator(publicProfile.id),
      ]);

      if (!mounted) {
        return;
      }

      setProfile(publicProfile);
      setStats(publicStats);
      setPlaces(withPlaceDistances(approvedPlaces, location));
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [profileId, location]);

  const placesRef = useRef(places);
  placesRef.current = places;

  const openPlaceDetail = useCallback(
    (placeId: string) => {
      navigation.push(MAP_ROUTES.PLACE_DETAIL, { placeId });
    },
    [navigation],
  );

  const handleLikeId = useCallback(
    (placeId: string) => {
      if (isToggling(placeId)) {
        return;
      }

      if (!requireAuth(user, 'like_place')) {
        setAuthPromptMessage('explore.auth.like');
        setAuthPromptVisible(true);
        return;
      }

      const place = placesRef.current.find((item) => item.id === placeId);
      const previouslyLiked = isLiked(placeId);
      const fallbackCount = place?.likeCount ?? 0;

      void toggleLike(placeId, fallbackCount)
        .then((result) => {
          if (result.success && typeof result.likeCount === 'number') {
            const nextCount = Math.max(0, result.likeCount);
            setPlaces((prev) =>
              prev.map((item) =>
                item.id === placeId ? { ...item, likeCount: nextCount } : item,
              ),
            );
            setStats((prev) => ({
              ...prev,
              likesReceived: Math.max(0, prev.likesReceived + (previouslyLiked ? -1 : 1)),
            }));
          }
        })
        .catch(() => undefined);
    },
    [isLiked, isToggling, toggleLike, user],
  );

  if (loading) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <PlaceDetailSkeleton />
      </ScreenContainer>
    );
  }

  if (notFound || !profile) {
    return (
      <ScreenContainer contentStyle={styles.centered}>
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
          {t('profile.public.notFoundTitle')}
        </Text>
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          {t('profile.public.notFoundBody')}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>
            {t('map.pickLocation.goBack')}
          </Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const displayName = getPublicDisplayName(profile);
  const usernameLabel = getPublicUsernameLabel(profile);
  const bio = profile.bio?.trim() || null;
  const isOwnProfile =
    Boolean(user) &&
    (myProfile?.id === profile.id ||
      myProfile?.auth_user_id === profile.authUserId ||
      user?.id === profile.authUserId);

  const openReport = () => {
    if (!requireAuth(user, 'report_profile')) {
      setAuthPromptMessage('profile.auth.report');
      setAuthPromptVisible(true);
      return;
    }
    setReportVisible(true);
  };

  const authPromptLocalized =
    localizeProfileMessage(authPromptMessage) ?? t(authPromptMessage as never);

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={styles.content}>
      <View style={{ height: insets.top + spacing.xs }} />

      <ProfileEntranceBlock index={0}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...shadows.sm,
              },
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.textSecondary }]}>
            {t('profile.publicTitle')}
          </Text>
          {!isOwnProfile ? (
            <Pressable
              onPress={openReport}
              style={[
                styles.backButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...shadows.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.a11y.report')}
            >
              <Ionicons name="flag-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backButtonSpacer} />
          )}
        </View>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={1} style={styles.profileHeader}>
        <ProfileAvatar displayName={displayName} avatarUrl={profile.avatarUrl} size={96} editable={false} />
        <Text style={[styles.name, { color: colors.textPrimary }]}>
          {usernameLabel ?? displayName}
        </Text>
        {bio ? (
          <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={4}>
            {bio}
          </Text>
        ) : null}
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={2}>
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              ...shadows.sm,
            },
          ]}
        >
          <View style={styles.statItem}>
            <AnimatedStatValue
              value={`${stats.sharedApprovedCount}`}
              color={colors.primary}
            />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('profile.stats.shared')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <AnimatedStatValue value={`${stats.likesReceived}`} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('profile.stats.likes')}
            </Text>
          </View>
        </View>
      </ProfileEntranceBlock>

      <ProfileEntranceBlock index={3}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('profile.public.sectionTitle')}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          {t('profile.public.sectionHint')}
        </Text>

        {places.length === 0 ? (
        <EmptyState
          icon="leaf-outline"
          title={t('profile.public.emptyTitle')}
          description={t('profile.public.emptyBody')}
        />
        ) : (
          <View style={styles.list}>
            {places.map((place, index) => (
              <ProfileGridItem key={place.id} index={index}>
                <PlaceListCard
                  place={place}
                  variant="publicProfile"
                  liked={isLiked(place.id)}
                  likeCount={getLikeCount(place.id, place.likeCount)}
                  likeDisabled={isToggling(place.id)}
                  onLikeId={handleLikeId}
                  onPressId={openPlaceDetail}
                />
              </ProfileGridItem>
            ))}
          </View>
        )}
      </ProfileEntranceBlock>

      <AuthRequiredModal
        visible={authPromptVisible}
        message={authPromptLocalized}
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />

      <ReportProfileModal
        visible={reportVisible}
        reportedAuthUserId={profile.authUserId}
        reportedUsername={profile.username}
        onClose={() => setReportVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  notFoundTitle: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  notFoundText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  backLink: {
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    ...typography.label,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: touchTarget.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backButtonSpacer: {
    width: touchTarget.min,
  },
  screenTitle: {
    ...typography.subtitle,
    fontSize: 16,
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  name: {
    ...typography.subtitle,
    fontSize: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bio: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    /** Extra space below bio; applied on a real View (not Animated.View). */
    marginTop: spacing.xxl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    paddingHorizontal: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
});
