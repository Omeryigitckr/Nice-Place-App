import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';

const COLLAPSED_LINES = 4;
const CHAR_THRESHOLD = 180;

interface PlaceDescriptionBlockProps {
  description: string;
}

export function PlaceDescriptionBlock({ description }: PlaceDescriptionBlockProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > CHAR_THRESHOLD;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About this place</Text>
      <Text
        style={[styles.description, { color: colors.textSecondary }]}
        numberOfLines={expanded || !isLong ? undefined : COLLAPSED_LINES}
      >
        {description}
      </Text>
      {isLong ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less' : 'Read more'}
        >
          <Text style={[styles.readMore, { color: colors.primary }]}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  description: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  readMore: {
    ...typography.label,
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
