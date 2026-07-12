import { Bookmark, BookmarkCheck } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSavePlaceWithCollections } from '../providers/SavePlaceWithCollectionsProvider';

import { CollectionActionButton } from './CollectionActionButton';

interface PlaceSaveButtonProps {
  placeId: string;
  saveCount?: number;
  onSaveCountChange?: (saveCount: number) => void;
  onRequiresAuth?: () => void;
  compact?: boolean;
  showLabel?: boolean;
}

export function PlaceSaveButton({
  placeId,
  saveCount = 0,
  onSaveCountChange,
  onRequiresAuth,
  compact = false,
  showLabel = true,
}: PlaceSaveButtonProps) {
  const { t } = useTranslation();
  const { isSaved, isSaving, getSaveCount, pressSave } = useSavePlaceWithCollections();
  const saved = isSaved(placeId);
  const saving = isSaving(placeId);
  const label = saved ? t('place.saved') : t('place.save');
  const Icon = saved ? BookmarkCheck : Bookmark;
  const accessibilityLabel = saved ? t('place.unsaveA11y') : t('place.saveA11y');

  const handlePress = useCallback(() => {
    void (async () => {
      const result = await pressSave(placeId, {
        saveCount: getSaveCount(placeId, saveCount),
        onSaveCountChange,
      });
      if (result.requiresAuth) {
        onRequiresAuth?.();
      }
    })();
  }, [getSaveCount, onRequiresAuth, onSaveCountChange, placeId, pressSave, saveCount]);

  if (compact || !showLabel) {
    return (
      <CollectionActionButton
        label={label}
        icon={Icon}
        onPress={handlePress}
        variant={saved ? 'secondary' : 'tertiary'}
        loading={saving}
        compact
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <CollectionActionButton
      label={label}
      icon={Icon}
      onPress={handlePress}
      variant={saved ? 'secondary' : 'tertiary'}
      loading={saving}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
