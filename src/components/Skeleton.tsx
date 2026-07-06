import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radius, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface SkeletonProps {
  width?: number | `${number}%` | '100%';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Static theme-aware placeholder — no pulse animation (release-safe). */
export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
        },
        style,
      ]}
    />
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileHeader}>
      <Skeleton width={96} height={96} borderRadius={48} />
      <Skeleton width={140} height={18} />
      <Skeleton width={100} height={12} />
      <Skeleton width="70%" height={12} />
    </View>
  );
}

/** Horizontal place list row (saved, search, profile saved). */
export function PlaceListSkeleton({ count = 3 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.listRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Skeleton width={84} height={84} borderRadius={0} />
          <View style={styles.listLines}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={12} />
            <Skeleton width="40%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Compact search-result rows. */
export function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return <PlaceListSkeleton count={count} />;
}

/** Profile shared places grid. */
export function PlaceGridSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Skeleton width="100%" height={110} borderRadius={0} />
          <View style={styles.gridLines}>
            <Skeleton width="80%" height={12} />
            <Skeleton width="50%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PlaceDetailSkeleton() {
  return (
    <View style={styles.detail}>
      <Skeleton width="100%" height={380} borderRadius={0} />
      <View style={styles.detailBody}>
        <Skeleton width={90} height={22} borderRadius={radius.full} />
        <Skeleton width="75%" height={22} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={72} borderRadius={radius.md} />
        <Skeleton width="100%" height={48} borderRadius={radius.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  listLines: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  gridLines: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  detail: {
    gap: spacing.md,
  },
  detailBody: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
