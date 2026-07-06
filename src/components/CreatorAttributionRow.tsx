import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { iconSizes, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { PublicProfileSummary, getPublicDisplayName } from '../types/publicProfile';

interface CreatorAttributionRowProps {
  creator: PublicProfileSummary | null;
  onPress?: () => void;
  variant?: 'card' | 'compact';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function CreatorAttributionRow({
  creator,
  onPress,
  variant = 'card',
}: CreatorAttributionRowProps) {
  const { colors, shadows } = useTheme();
  const displayName = creator ? getPublicDisplayName(creator) : 'Nice Place community';
  const isInteractive = Boolean(creator && onPress);

  if (variant === 'compact') {
    const compactContent = (
      <View style={styles.compactRow}>
        <View
          style={[
            styles.compactAvatar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {creator?.avatarUrl ? (
            <Image
              source={{ uri: creator.avatarUrl }}
              style={styles.compactAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.compactAvatarText, { color: colors.primary }]}>
              {getInitials(displayName)}
            </Text>
          )}
        </View>
        <Text style={[styles.compactText, { color: colors.textSecondary }]} numberOfLines={1}>
          Discovered by{' '}
          <Text style={[styles.compactUsername, { color: colors.textPrimary }]}>
            {displayName}
          </Text>
        </Text>
        {isInteractive ? (
          <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textMuted} />
        ) : null}
      </View>
    );

    if (!isInteractive) {
      return compactContent;
    }

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${displayName}`}
      >
        {compactContent}
      </Pressable>
    );
  }

  const content = (
    <View style={styles.row}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.primaryBorder,
          },
        ]}
      >
        {creator?.avatarUrl ? (
          <Image source={{ uri: creator.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {getInitials(displayName)}
          </Text>
        )}
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Discovered by</Text>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {isInteractive ? (
        <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.textMuted} />
      ) : null}
    </View>
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      ...shadows.sm,
    },
  ];

  if (!isInteractive) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${displayName}`}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarText: {
    ...typography.caption,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.caption,
  },
  name: {
    ...typography.label,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactAvatarImage: {
    width: 28,
    height: 28,
  },
  compactAvatarText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  compactText: {
    ...typography.bodySmall,
    flex: 1,
  },
  compactUsername: {
    fontWeight: '600',
  },
});
