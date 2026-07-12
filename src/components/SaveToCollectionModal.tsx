import { Check, FolderPlus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CollectionModalMode } from '../providers/SavePlaceWithCollectionsProvider';
import { hapticLight, showAppToast } from '../feedback';
import {
  COLLECTION_NAME_MAX_LENGTH,
  createCollection,
  getCollectionsForPlace,
  getMyCollections,
  togglePlaceInCollection,
} from '../services/collectionsService';
import { radius, spacing, typography } from '../theme';
import { iconSizes } from '../theme/icons';
import { useTheme } from '../theme/ThemeContext';
import { SavedCollection } from '../types/collection';
import { localizeCollectionMessage } from '../utils/collectionMessages';

import { AppButton } from './AppButton';
import { AppTextInput } from './AppTextInput';
import { CollectionActionButton } from './CollectionActionButton';

interface SaveToCollectionModalProps {
  visible: boolean;
  mode?: CollectionModalMode;
  profileId: string | null;
  placeId: string | null;
  saveCount?: number;
  onClose: () => void;
  onMembershipChange?: () => void;
}

export function SaveToCollectionModal({
  visible,
  mode = 'post-save',
  profileId,
  placeId,
  saveCount = 0,
  onClose,
  onMembershipChange,
}: SaveToCollectionModalProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const isPostSave = mode === 'post-save';

  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visible || !profileId || !placeId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [list, membership] = await Promise.all([
        getMyCollections(profileId),
        getCollectionsForPlace(profileId, placeId),
      ]);
      setCollections(list);
      setMemberIds(membership);
    } catch {
      setError('collections.modal.loadError');
    } finally {
      setLoading(false);
    }
  }, [visible, profileId, placeId]);

  useEffect(() => {
    if (visible) {
      void load();
      setShowCreate(false);
      setNewName('');
    }
  }, [visible, load]);

  const handleToggle = async (collectionId: string) => {
    if (!profileId || !placeId || submittingId) {
      return;
    }

    const inCollection = memberIds.includes(collectionId);
    setSubmittingId(collectionId);
    const result = await togglePlaceInCollection(
      profileId,
      collectionId,
      placeId,
      inCollection,
      { saveCount, autoSave: false },
    );
    setSubmittingId(null);

    if (!result.success) {
      showAppToast(
        localizeCollectionMessage(result.error) ?? t('collections.toasts.updateFailed'),
        { tone: 'error' },
      );
      return;
    }

    setMemberIds((current) =>
      inCollection ? current.filter((id) => id !== collectionId) : [...current, collectionId],
    );
    hapticLight();
    onMembershipChange?.();
  };

  const handleCreate = async () => {
    if (!profileId || !placeId || creating) {
      return;
    }

    setCreating(true);
    setError(null);
    const result = await createCollection(profileId, newName);
    setCreating(false);

    if (!result.success || !result.collection) {
      setError(result.error ?? 'collections.toasts.createFailed');
      return;
    }

    setCollections((current) => [result.collection!, ...current]);
    setShowCreate(false);
    setNewName('');
    showAppToast(t('collections.toasts.created'), { tone: 'success', durationMs: 1400 });

    setSubmittingId(result.collection.id);
    const addResult = await togglePlaceInCollection(
      profileId,
      result.collection.id,
      placeId,
      false,
      { saveCount, autoSave: false },
    );
    setSubmittingId(null);
    if (addResult.success) {
      setMemberIds((current) => [...current, result.collection!.id]);
      onMembershipChange?.();
    }
  };

  const title = isPostSave ? t('collections.modal.titleSaved') : t('collections.modal.titleManage');
  const subtitle = isPostSave
    ? t('collections.modal.subtitlePostSave')
    : t('collections.modal.subtitleManage');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + spacing.md,
            borderTopColor: colors.border,
            ...shadows.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
            >
              {error ? (
                <Text style={[styles.error, { color: colors.error }]}>
                  {localizeCollectionMessage(error) ?? error}
                </Text>
              ) : null}

              {showCreate ? (
                <View style={styles.createBox}>
                  <AppTextInput
                    label={t('collections.form.collectionNameLabel')}
                    placeholder={t('collections.form.collectionNamePlaceholder')}
                    value={newName}
                    onChangeText={setNewName}
                    maxLength={COLLECTION_NAME_MAX_LENGTH}
                  />
                  <View style={styles.createActions}>
                    <AppButton
                      title={t('common.cancel')}
                      variant="secondary"
                      size="sm"
                      onPress={() => setShowCreate(false)}
                      fullWidth={false}
                    />
                    <AppButton
                      title={t('common.create')}
                      size="sm"
                      onPress={() => {
                        void handleCreate();
                      }}
                      loading={creating}
                      fullWidth={false}
                    />
                  </View>
                </View>
              ) : (
                <CollectionActionButton
                  label={t('collections.actions.createNew')}
                  icon={FolderPlus}
                  onPress={() => setShowCreate(true)}
                  variant="secondary"
                  compact={false}
                />
              )}

              {collections.length === 0 && !showCreate ? (
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  {isPostSave
                    ? t('collections.modal.emptyPostSave')
                    : t('collections.modal.emptyManage')}
                </Text>
              ) : (
                <View style={styles.list}>
                  {collections.map((collection) => {
                    const active = memberIds.includes(collection.id);
                    const busy = submittingId === collection.id;
                    return (
                      <Pressable
                        key={collection.id}
                        onPress={() => {
                          void handleToggle(collection.id);
                        }}
                        disabled={busy}
                        style={[
                          styles.row,
                          {
                            backgroundColor: colors.card,
                            borderColor: active ? colors.primaryBorder : colors.border,
                          },
                        ]}
                      >
                        <View style={styles.rowText}>
                          <Text
                            style={[styles.rowTitle, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {collection.name}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                            {t('common.placesCount', { count: collection.placeCount })}
                          </Text>
                        </View>
                        {busy ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : active ? (
                          <Check size={iconSizes.sm} color={colors.primary} strokeWidth={2.5} />
                        ) : (
                          <View
                            style={[styles.emptyCheck, { borderColor: colors.textMuted }]}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {isPostSave ? (
                <AppButton
                  title={t('collections.modal.notNow')}
                  variant="secondary"
                  size="sm"
                  onPress={onClose}
                  fullWidth={false}
                />
              ) : null}
              <AppButton title={t('common.done')} size="sm" onPress={onClose} fullWidth={false} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '58%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 99,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
    gap: 4,
  },
  title: {
    ...typography.subtitle,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  error: {
    ...typography.caption,
  },
  createBox: {
    gap: spacing.sm,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  emptyHint: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 52,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.label,
    fontWeight: '600',
  },
  rowMeta: {
    ...typography.caption,
  },
  emptyCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
