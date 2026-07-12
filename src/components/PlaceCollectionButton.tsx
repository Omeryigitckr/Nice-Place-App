import { FolderHeart } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSavePlaceWithCollections } from '../providers/SavePlaceWithCollectionsProvider';

import { CollectionActionButton } from './CollectionActionButton';

interface PlaceCollectionButtonProps {
  placeId: string;
  saveCount?: number;
  onRequiresAuth?: () => void;
  compact?: boolean;
  label?: string;
}

export function PlaceCollectionButton({
  placeId,
  saveCount = 0,
  onRequiresAuth,
  compact = true,
  label,
}: PlaceCollectionButtonProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('collections.actions.add');
  const { getSaveCount, openManageCollections } = useSavePlaceWithCollections();

  const handlePress = useCallback(() => {
    const result = openManageCollections(placeId, {
      saveCount: getSaveCount(placeId, saveCount),
    });
    if (result.requiresAuth) {
      onRequiresAuth?.();
    }
  }, [getSaveCount, onRequiresAuth, openManageCollections, placeId, saveCount]);

  return (
    <CollectionActionButton
      label={resolvedLabel}
      icon={FolderHeart}
      onPress={handlePress}
      variant="secondary"
      compact={compact}
      accessibilityLabel={resolvedLabel}
    />
  );
}
