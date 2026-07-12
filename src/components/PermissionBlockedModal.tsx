import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppButton } from './AppButton';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface PermissionBlockedModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onOpenSettings: () => void;
  onCancel: () => void;
}

export function PermissionBlockedModal({
  visible,
  title,
  message,
  onOpenSettings,
  onCancel,
}: PermissionBlockedModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View
        style={[
          styles.center,
          {
            paddingTop: Math.max(insets.top, spacing.lg),
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.lg,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title ?? t('permissions.requiredTitle')}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.actions}>
            <AppButton
              title={t('permissions.blocked.cancel')}
              variant="secondary"
              onPress={onCancel}
              fullWidth={false}
            />
            <AppButton
              title={t('permissions.blocked.openSettings')}
              onPress={onOpenSettings}
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
