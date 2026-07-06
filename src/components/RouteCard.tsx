/**
 * Post-launch only. Not exported for launch; community routes are postponed.
 * See docs/ROADMAP.md.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { Route } from '../types/route';

interface RouteCardProps {
  route: Route;
  onPress?: () => void;
}

const DIFFICULTY_LABELS: Record<Route['difficulty'], string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

const DIFFICULTY_COLORS: Record<Route['difficulty'], string> = {
  easy: colors.primary,
  moderate: colors.accent,
  hard: colors.error,
};

export function RouteCard({ route, onPress }: RouteCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: route.image }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />

      <View style={styles.topRow}>
        <View style={styles.regionBadge}>
          <Ionicons name="location-outline" size={12} color={colors.primary} />
          <Text style={styles.regionText}>{route.region}</Text>
        </View>
        <View
          style={[
            styles.difficultyBadge,
            { borderColor: `${DIFFICULTY_COLORS[route.difficulty]}55` },
          ]}
        >
          <Text
            style={[styles.difficultyText, { color: DIFFICULTY_COLORS[route.difficulty] }]}
          >
            {DIFFICULTY_LABELS[route.difficulty]}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{route.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {route.description}
        </Text>

        <View style={styles.statsRow}>
          <StatItem icon="footsteps-outline" label={route.distance} />
          <StatItem icon="time-outline" label={route.duration} />
          <StatItem icon="trending-up-outline" label={DIFFICULTY_LABELS[route.difficulty]} />
        </View>
      </View>
    </Pressable>
  );
}

function StatItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  image: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surfaceElevated,
  },
  overlayTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 11, 18, 0.15)',
  },
  overlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    backgroundColor: 'rgba(8, 11, 18, 0.72)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(8, 11, 18, 0.55)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  regionText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(8, 11, 18, 0.55)',
    borderWidth: 1,
  },
  difficultyText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    fontSize: 20,
    lineHeight: 26,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.glassHighlight,
    borderWidth: 1,
    borderColor: 'rgba(61, 155, 110, 0.2)',
  },
  statText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
