import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

import { AppButton } from './AppButton';

export interface LegalInfoContent {
  title: string;
  body: string;
}

interface LegalInfoModalProps {
  visible: boolean;
  content: LegalInfoContent | null;
  onClose: () => void;
}

export function LegalInfoModal({ visible, content, onClose }: LegalInfoModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  if (!content) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{content.title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeHit}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{content.body}</Text>
          </ScrollView>
          <AppButton title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
    flex: 1,
    paddingRight: spacing.sm,
  },
  scroll: {
    flexGrow: 0,
  },
  body: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
});
