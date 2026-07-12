import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { spacing, typography } from '../../theme';
import { useThemeColors } from '../../theme/ThemeContext';

const COLLAPSED_LINES = 4;
const CHAR_THRESHOLD = 180;

interface PlaceDescriptionBlockProps {
  description: string;
}

export function PlaceDescriptionBlock({ description }: PlaceDescriptionBlockProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > CHAR_THRESHOLD;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('placeDetail.about')}</Text>
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
          accessibilityLabel={expanded ? t('placeDetail.showLess') : t('placeDetail.readMore')}
        >
          <Text style={[styles.readMore, { color: colors.primary }]}>
            {expanded ? t('placeDetail.showLess') : t('placeDetail.readMore')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
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
