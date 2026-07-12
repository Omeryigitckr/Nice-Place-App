import { useFocusEffect } from '@react-navigation/native';
import { Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AppButton,
  AppTextInput,
  CollectionActionButton,
  EmptyState,
  PlaceCollectionButton,
  PlaceListCard,
  PlaceListSkeleton,
  SectionHeader,
} from '../components';
import { readCollectionPlacesCache } from '../cache';
import { MAP_ROUTES, SAVED_ROUTES, TAB_ROUTES } from '../constants';
import { showAppToast } from '../feedback';
import {
  useAppSettings,
  useAuth,
  useFloatingTabBarInset,
  usePlaceLikes,
  useUserLocation,
} from '../hooks';
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
  deleteCollection,
  getCollectionPlaces,
  removePlaceFromCollection,
  updateCollection,
} from '../services';
import { radius, spacing } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { Place } from '../types/place';
import { SavedStackParamList } from '../types';
import { withPlaceDistances } from '../utils';
import { localizeCollectionMessage } from '../utils/collectionMessages';

type Props = NativeStackScreenProps<
  SavedStackParamList,
  typeof SAVED_ROUTES.COLLECTION_DETAIL
>;

const STALE_MS = 45_000;
const keyExtractor = (item: Place) => item.id;
const ItemSeparator = () => <View style={styles.separator} />;

export function CollectionDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tabBarInset = useFloatingTabBarInset();
  const { profile } = useAuth();
  const { settings } = useAppSettings();
  const { location } = useUserLocation();
  const { isLiked, getLikeCount, isToggling, toggleLike } = usePlaceLikes();
  const collectionId = route.params.collectionId;

  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lastFetchAtRef = useRef(0);
  const placesRef = useRef(places);
  placesRef.current = places;

  const displayPlaces = useMemo(
    () => withPlaceDistances(places, location),
    [places, location, settings.distanceUnit],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      if (!options?.silent) {
        const cached = await readCollectionPlacesCache(collectionId, { allowExpired: true });
        if (cached?.length) {
          setPlaces(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      const result = await getCollectionPlaces(profile.id, collectionId, profile.id);
      if (result.collection) {
        setCollectionName(result.collection.name);
        setCollectionDescription(result.collection.description);
        setEditName(result.collection.name);
        setEditDescription(result.collection.description ?? '');
      }
      setPlaces(result.places);
      lastFetchAtRef.current = Date.now();
      setLoading(false);
    },
    [collectionId, profile?.id],
  );

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchAtRef.current < STALE_MS && placesRef.current.length > 0) {
        return;
      }
      void load();
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
    showAppToast(t('collections.toasts.updated'), { tone: 'success', durationMs: 1400 });
  }, [load, t]);

  const openOnMap = useCallback(
    (placeId: string) => {
      navigation.getParent()?.navigate(TAB_ROUTES.EXPLORE, {
        screen: MAP_ROUTES.PLACE_DETAIL,
        params: { placeId },
      });
    },
    [navigation],
  );

  const handleRemoveFromCollection = useCallback(
    (placeId: string) => {
      if (!profile?.id) {
        return;
      }

      Alert.alert(t('collections.alerts.removeTitle'), t('collections.alerts.removeBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await removePlaceFromCollection(profile.id, collectionId, placeId);
              if (!result.success) {
                showAppToast(
                  localizeCollectionMessage(result.error) ?? t('collections.toasts.removeFailed'),
                  { tone: 'error' },
                );
                return;
              }
              setPlaces((current) => current.filter((item) => item.id !== placeId));
              showAppToast(t('collections.toasts.removedPlace'), {
                tone: 'success',
                durationMs: 1400,
              });
            })();
          },
        },
      ]);
    },
    [collectionId, profile?.id, t],
  );

  const handleSaveEdit = async () => {
    if (!profile?.id || savingEdit) {
      return;
    }

    setSavingEdit(true);
    const result = await updateCollection(profile.id, collectionId, {
      name: editName,
      description: editDescription,
    });
    setSavingEdit(false);

    if (!result.success || !result.collection) {
      showAppToast(
        localizeCollectionMessage(result.error) ?? t('collections.toasts.updateFailed'),
        { tone: 'error' },
      );
      return;
    }

    setCollectionName(result.collection.name);
    setCollectionDescription(result.collection.description);
    setEditing(false);
    showAppToast(t('collections.toasts.updated'), { tone: 'success', durationMs: 1400 });
  };

  const handleDelete = async () => {
    if (!profile?.id || deleting) {
      return;
    }

    setDeleting(true);
    const result = await deleteCollection(profile.id, collectionId);
    setDeleting(false);

    if (!result.success) {
      showAppToast(
        localizeCollectionMessage(result.error) ?? t('collections.toasts.deleteFailed'),
        { tone: 'error' },
      );
      return;
    }

    showAppToast(t('collections.toasts.deleted'), { tone: 'success', durationMs: 1400 });
    navigation.goBack();
  };

  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item }) => (
      <View style={styles.cardWrap}>
        <PlaceListCard
          place={item}
          saved
          liked={isLiked(item.id)}
          likeCount={getLikeCount(item.id, item.likeCount)}
          likeDisabled={isToggling(item.id)}
          onLikeId={(placeId) => {
            void toggleLike(placeId, item.likeCount).catch(() => undefined);
          }}
          onPressId={openOnMap}
          actionLabel={t('saved.viewOnMap')}
          onActionId={openOnMap}
        />
        <View style={styles.cardActions}>
          <PlaceCollectionButton
            placeId={item.id}
            saveCount={item.saveCount}
            label={t('collections.actions.manage')}
            compact={false}
          />
          <CollectionActionButton
            label={t('collections.actions.remove')}
            icon={Trash2}
            onPress={() => handleRemoveFromCollection(item.id)}
            variant="destructive"
            compact
            accessibilityLabel={t('collections.actions.removeA11y')}
          />
        </View>
      </View>
    ),
    [getLikeCount, handleRemoveFromCollection, isLiked, isToggling, openOnMap, t, toggleLike],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <SectionHeader
          title={collectionName || t('collections.fallbackTitle')}
          subtitle={collectionDescription ?? t('collections.defaultSubtitle')}
          count={!loading ? displayPlaces.length : undefined}
        />

        {editing ? (
          <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppTextInput
              label={t('collections.form.nameLabel')}
              value={editName}
              onChangeText={setEditName}
              maxLength={COLLECTION_NAME_MAX_LENGTH}
            />
            <AppTextInput
              label={t('collections.form.descriptionLabel')}
              value={editDescription}
              onChangeText={setEditDescription}
              maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
              multiline
              numberOfLines={2}
            />
            <View style={styles.editActions}>
              <AppButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setEditing(false)}
                fullWidth={false}
              />
              <AppButton
                title={t('common.save')}
                onPress={() => void handleSaveEdit()}
                loading={savingEdit}
                fullWidth={false}
              />
            </View>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <AppButton
              title={t('common.edit')}
              variant="secondary"
              onPress={() => setEditing(true)}
              fullWidth={false}
            />
            <AppButton
              title={t('common.delete')}
              variant="secondary"
              onPress={() => {
                Alert.alert(t('collections.alerts.deleteTitle'), t('collections.alerts.deleteBody'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                      void handleDelete();
                    },
                  },
                ]);
              }}
              fullWidth={false}
            />
          </View>
        )}
      </View>
    ),
    [
      collectionDescription,
      collectionName,
      colors.border,
      colors.card,
      displayPlaces.length,
      editDescription,
      editName,
      editing,
      loading,
      savingEdit,
      t,
    ],
  );

  const listEmpty = useMemo(() => {
    if (loading) {
      return <PlaceListSkeleton count={3} />;
    }
    return (
      <EmptyState
        icon="bookmark-outline"
        title={t('collections.empty.noPlacesTitle')}
        description={t('collections.empty.noPlacesBody')}
      />
    );
  }, [loading, t]);

  return (
    <>
      <FlatList
        data={displayPlaces}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarInset.contentPaddingBottom + spacing.lg },
        ]}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.md,
  },
  editCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
  cardWrap: {
    gap: spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
