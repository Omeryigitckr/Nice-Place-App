/**
 * Post-launch only. Not wired into the main tab bar for the first public release.
 * See docs/ROADMAP.md.
 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState, ScreenContainer, SectionHeader } from '../components';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export function RoutesScreen() {
  const { colors } = useTheme();

  return (
    <ScreenContainer scrollable safeTop={false} contentStyle={styles.content}>
      <SectionHeader
        title="Trail discovery"
        subtitle="Outdoor routes shared by the community."
      />

      <EmptyState
        icon="trail-sign-outline"
        title="Coming after launch"
        description="Community routes are postponed until after the first public release."
      />

      <View
        style={[
          styles.note,
          { backgroundColor: colors.glass, borderColor: colors.glassBorder },
        ]}
      >
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          Routes are not part of the launch scope. Navigation to places uses your device maps app.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  noteText: {
    ...typography.bodySmall,
    flex: 1,
  },
});
