import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppButton,
  AppTextInput,
  AuthRequiredModal,
  CollectionCard,
  EmptyState,
  PlaceListSkeleton,
  SavedScreenSection,
  SectionHeader,
  SystemSavedCollectionCard,
} from '../components';
import { readCollectionsListCache, readSavedIdsCache } from '../cache';
import { SAVED_ROUTES } from '../constants';
import { showAppToast } from '../feedback';
import { useAuth, useFloatingTabBarInset, useSavedPlaces } from '../hooks';
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
  createCollection,
  getMyCollections,
  getSavedPlaceIds,
} from '../services';
import { radius, spacing } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { SavedCollection } from '../types/collection';
import { SavedStackParamList } from '../types';
import { navigateToAuth } from '../utils/authGuard';
import { localizeCollectionMessage } from '../utils/collectionMessages';

type Props = NativeStackScreenProps<SavedStackParamList, typeof SAVED_ROUTES.SAVED_HOME>;

const STALE_MS = 45_000;
const keyExtractor = (item: SavedCollection) => item.id;
const ItemSeparator = () => <View style={styles.separator} />;

export function SavedHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tabBarInset = useFloatingTabBarInset();
  const { user, profile, loading: authLoading } = useAuth();
  const { ready, syncIds, savedIds } = useSavedPlaces();

  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [allSavedCount, setAllSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const lastFetchRef = useRef(0);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!profile?.id) {
        setCollections([]);
        setAllSavedCount(0);
        setLoading(false);
        return;
      }

      if (!options?.silent) {
        const cached = await readCollectionsListCache(profile.id, { allowExpired: true });
        if (cached) {
          setCollections(cached);
        }
        const cachedIds = await readSavedIdsCache(profile.id, { allowExpired: true });
        if (cachedIds) {
          setAllSavedCount(cachedIds.length);
        }
        if (cached || cachedIds) {
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const [list, ids] = await Promise.all([
          getMyCollections(profile.id),
          getSavedPlaceIds(profile.id),
        ]);
        setCollections(list);
        setAllSavedCount(ids.length);
        syncIds(ids);
        lastFetchRef.current = Date.now();
      } catch {
        // Keep cached values.
      } finally {
        setLoading(false);
      }
    },
    [profile?.id, syncIds],
  );

  useEffect(() => {
    if (!profile?.id) {
      setCollections([]);
      setAllSavedCount(0);
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchRef.current < STALE_MS && lastFetchRef.current > 0) {
        return;
      }
      void load();
    }, [load]),
  );

  const displayCount = useMemo(() => {
    if (profile?.id && ready) {
      return Math.max(allSavedCount, savedIds.length);
    }
    return allSavedCount;
  }, [allSavedCount, profile?.id, ready, savedIds.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
    showAppToast(t('saved.home.toastRefreshed'), { tone: 'success', durationMs: 1400 });
  }, [load, t]);

  const openAllSaved = useCallback(() => {
    navigation.navigate(SAVED_ROUTES.ALL_SAVED_PLACES);
  }, [navigation]);

  const openCollection = useCallback(
    (collectionId: string) => {
      navigation.navigate(SAVED_ROUTES.COLLECTION_DETAIL, { collectionId });
    },
    [navigation],
  );

  const handleCreateCollection = async () => {
    if (!profile?.id || creatingCollection) {
      return;
    }
    setCreatingCollection(true);
    const result = await createCollection(
      profile.id,
      newCollectionName,
      newCollectionDescription,
    );
    setCreatingCollection(false);
    if (!result.success || !result.collection) {
      showAppToast(
        localizeCollectionMessage(result.error) ?? t('collections.toasts.createFailed'),
        { tone: 'error' },
      );
      return;
    }
    setCollections((current) => [result.collection!, ...current]);
    setShowCreateCollection(false);
    setNewCollectionName('');
    setNewCollectionDescription('');
    showAppToast(t('collections.toasts.created'), { tone: 'success', durationMs: 1400 });
  };

  const renderItem: ListRenderItem<SavedCollection> = useCallback(
    ({ item }) => <CollectionCard collection={item} onPressId={openCollection} />,
    [openCollection],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <SectionHeader
          title={t('saved.home.title')}
          subtitle={t('saved.home.subtitle')}
        />

        {user ? (
          <SystemSavedCollectionCard placeCount={displayCount} onPress={openAllSaved} />
        ) : null}

        <SavedScreenSection
          title={t('saved.home.yourCollections')}
          actionLabel={user && !showCreateCollection ? t('saved.home.createAction') : undefined}
          onAction={
            user && !showCreateCollection ? () => setShowCreateCollection(true) : undefined
          }
        >
          {user && showCreateCollection ? (
            <View
              style={[
                styles.createCard,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <AppTextInput
                label={t('collections.form.nameLabel')}
                placeholder={t('collections.form.namePlaceholder')}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                maxLength={COLLECTION_NAME_MAX_LENGTH}
              />
              <AppTextInput
                label={t('collections.form.descriptionLabel')}
                placeholder={t('collections.form.descriptionPlaceholder')}
                value={newCollectionDescription}
                onChangeText={setNewCollectionDescription}
                maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
                multiline
                numberOfLines={2}
              />
              <View style={styles.createActions}>
                <AppButton
                  title={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setShowCreateCollection(false)}
                  fullWidth={false}
                />
                <AppButton
                  title={t('common.create')}
                  onPress={() => {
                    void handleCreateCollection();
                  }}
                  loading={creatingCollection}
                  fullWidth={false}
                />
              </View>
            </View>
          ) : null}
        </SavedScreenSection>
      </View>
    ),
    [
      colors.border,
      colors.card,
      creatingCollection,
      displayCount,
      newCollectionDescription,
      newCollectionName,
      openAllSaved,
      showCreateCollection,
      t,
      user,
    ],
  );

  const listEmpty = useMemo(() => {
    if (authLoading || (user && loading)) {
      return <PlaceListSkeleton count={2} />;
    }
    if (!user) {
      return null;
    }
    return (
      <EmptyState
        icon="albums-outline"
        title={t('collections.empty.noCollectionsTitle')}
        description={t('collections.empty.noCollectionsBody')}
        action={
          !showCreateCollection ? (
            <AppButton
              title={t('collections.empty.createCta')}
              onPress={() => setShowCreateCollection(true)}
              fullWidth={false}
            />
          ) : undefined
        }
      />
    );
  }, [authLoading, loading, showCreateCollection, t, user]);

  const guestBlock = !user && !authLoading ? (
    <EmptyState
      icon="person-outline"
      title={t('saved.empty.guestTitle')}
      description={t('saved.empty.guestBodyHome')}
      action={
        <AppButton
          title={t('common.signIn')}
          onPress={() => navigateToAuth(navigation)}
          fullWidth={false}
        />
      }
    />
  ) : null;

  const contentContainerStyle = useMemo(
    () => [
      styles.content,
      { paddingBottom: tabBarInset.contentPaddingBottom + spacing.lg },
    ],
    [tabBarInset.contentPaddingBottom],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={user && !loading ? collections : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={user ? listEmpty : guestBlock}
        contentContainerStyle={contentContainerStyle}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          user ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      />

      <AuthRequiredModal
        visible={authPromptVisible}
        message={t('saved.auth.manage')}
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
  createCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
