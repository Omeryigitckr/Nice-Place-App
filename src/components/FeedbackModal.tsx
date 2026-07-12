import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

import { AppButton } from './AppButton';

type FeedbackVariant = 'success' | 'error';

interface FeedbackModalProps {
  visible: boolean;
  variant: FeedbackVariant;
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function FeedbackModal({
  visible,
  variant,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: FeedbackModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const isSuccess = variant === 'success';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onSecondary ?? onPrimary}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrimHeavy }]}
          onPress={onSecondary ?? onPrimary}
          accessibilityLabel={t('common.dismiss')}
        />
        <View
          style={[
            styles.card,
            {
              marginBottom: Math.max(insets.bottom, spacing.lg),
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              ...shadows.lg,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isSuccess ? colors.primary : colors.error },
            ]}
          >
            <Ionicons
              name={isSuccess ? 'checkmark' : 'alert'}
              size={28}
              color={colors.white}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

          <View style={styles.actions}>
            <AppButton title={primaryLabel} onPress={onPrimary} />
            {secondaryLabel && onSecondary ? (
              <AppButton title={secondaryLabel} variant="secondary" onPress={onSecondary} />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
