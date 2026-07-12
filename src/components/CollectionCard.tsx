import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { SavedCollection } from '../types/collection';

import { CachedImage } from './CachedImage';

interface CollectionCardProps {
  collection: SavedCollection;
  onPress?: () => void;
  onPressId?: (collectionId: string) => void;
}

export function CollectionCard({ collection, onPress, onPressId }: CollectionCardProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  const handlePress = () => {
    onPress?.();
    onPressId?.(collection.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadows.sm,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${t('common.placesCount', { count: collection.placeCount })}`}
    >
      <View style={[styles.coverWrap, { backgroundColor: colors.surfaceSecondary }]}>
        {collection.coverPhotoUrl ? (
          <CachedImage
            uri={collection.coverPhotoUrl}
            width="100%"
            height={112}
            borderRadius={radius.lg}
            recyclingKey={`collection-cover-${collection.id}`}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="albums-outline" size={28} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {collection.name}
        </Text>
        {collection.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {collection.description}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('common.placesCount', { count: collection.placeCount })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  coverWrap: {
    height: 112,
    width: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
  },
  description: {
    ...typography.caption,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
