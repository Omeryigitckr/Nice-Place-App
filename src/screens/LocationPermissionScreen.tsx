import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { AppButton, ScreenContainer } from '../components';
import { ROOT_ROUTES } from '../constants';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROOT_ROUTES.LOCATION_PERMISSION>;

export function LocationPermissionScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.iconWrap}>
        <Ionicons name="location" size={40} color={colors.primary} />
      </View>

      <Text style={styles.title}>{t('permissions.location.title')}</Text>
      <Text style={styles.description}>{t('permissions.location.description')}</Text>

      <View style={styles.features}>
        <FeatureRow text={t('permissions.location.featureNearby')} />
        <FeatureRow text={t('permissions.location.featureDistance')} />
        <FeatureRow text={t('permissions.location.featurePrivate')} />
      </View>

      <View style={styles.actions}>
        <AppButton
          title={t('permissions.location.allow')}
          onPress={() => navigation.replace(ROOT_ROUTES.MAIN)}
        />
        <AppButton
          title={t('permissions.location.notNow')}
          variant="secondary"
          onPress={() => navigation.replace(ROOT_ROUTES.MAIN)}
        />
      </View>
    </ScreenContainer>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
