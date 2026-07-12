import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';

import { CollectionActionButton } from './CollectionActionButton';
import { PlaceCollectionButton } from './PlaceCollectionButton';

interface PlaceCardCollectionActionsProps {
  placeId: string;
  saveCount?: number;
  onRequiresAuth?: () => void;
  onUnsave?: () => void;
  unsaveLoading?: boolean;
}

export function PlaceCardCollectionActions({
  placeId,
  saveCount = 0,
  onRequiresAuth,
  onUnsave,
  unsaveLoading = false,
}: PlaceCardCollectionActionsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <PlaceCollectionButton
        placeId={placeId}
        saveCount={saveCount}
        onRequiresAuth={onRequiresAuth}
        compact={false}
        label={t('collections.actions.add')}
      />
      {onUnsave ? (
        <CollectionActionButton
          label={t('saved.unsave')}
          icon={Trash2}
          onPress={onUnsave}
          variant="destructive"
          loading={unsaveLoading}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
