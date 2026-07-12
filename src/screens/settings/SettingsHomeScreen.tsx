import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  AppTextInput,
  LegalInfoModal,
  ProfileAvatar,
  ProfileEntranceBlock,
  ScreenContainer,
  ToastBanner,
} from '../../components';
import { FeedbackModal } from '../../components/FeedbackModal';
import { PROFILE_ROUTES } from '../../constants';
import { useAppSettings, useAuth, useAppPermissions } from '../../hooks';
import { useNotifications } from '../../hooks/useNotifications';
import { resetNotificationsMemory } from '../../hooks/useNotifications';
import {
  getLanguageMeta,
  useAppLanguage,
} from '../../i18n';
import { resetToMain } from '../../navigation/navigationHelpers';
import { deleteUserAccount, signOut } from '../../services';
import { resetPlaceLikesMemory } from '../../hooks/usePlaceLikes';
import { resetSavedPlacesMemory } from '../../hooks/useSavedPlaces';
import {
  DistanceUnit,
  MapStylePreference,
  ThemeMode,
} from '../../services/settingsService';
import { radius, spacing, typography } from '../../theme';
import { motion, motionEasing } from '../../theme/motion';
import { useThemeColors } from '../../theme/ThemeContext';
import { ProfileStackParamList } from '../../types';
import { navigateToAuth } from '../../utils/authGuard';
import {
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  getLegalContent,
  getPermissionStatusLabel,
  localizeSettingsMessage,
  type LegalContentId,
} from '../../utils/settingsMessages';
import { userHasEmailPassword } from '../../utils/userAccount';
import {
  APP_VERSION,
  SettingsLinkRow,
  SettingsSection,
  SettingsSegmentedControl,
  SUPPORT_EMAIL,
  settingsStyles,
} from './settingsShared';


type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS>;

const THEME_OPTIONS: {
  value: ThemeMode;
  labelKey: 'settings.theme.system' | 'settings.theme.light' | 'settings.theme.dark';
}[] = [
  { value: 'system', labelKey: 'settings.theme.system' },
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
];

const MAP_STYLE_OPTIONS: {
  value: MapStylePreference;
  labelKey: 'settings.mapStyle.standard' | 'settings.mapStyle.satellite' | 'settings.mapStyle.outdoors';
}[] = [
  { value: 'standard', labelKey: 'settings.mapStyle.standard' },
  { value: 'satellite', labelKey: 'settings.mapStyle.satellite' },
  { value: 'outdoors', labelKey: 'settings.mapStyle.outdoors' },
];

const UNIT_OPTIONS: {
  value: DistanceUnit;
  labelKey: 'settings.distanceUnit.kilometers' | 'settings.distanceUnit.miles';
}[] = [
  { value: 'km', labelKey: 'settings.distanceUnit.kilometers' },
  { value: 'mi', labelKey: 'settings.distanceUnit.miles' },
];

type ConfirmAction = 'clear_cache' | 'reset_preferences' | null;

export function SettingsHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const languageMeta = getLanguageMeta(language);
  const { user, profile, loading: authLoading, refresh } = useAuth();
  const { settings, updateSettings, resetSettings, clearCache } = useAppSettings();
  const { preferences } = useNotifications(profile?.id);
  const { notification } = useAppPermissions();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [legalContentId, setLegalContentId] = useState<LegalContentId | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [acting, setActing] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const themeFade = useRef(new Animated.Value(1)).current;
  const accountScale = useRef(new Animated.Value(1)).current;

  const isGuest = !user;
  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    user?.email?.split('@')[0] ||
    t('profile.explorerFallback');

  const showToast = (message: string) => setToastMessage(message);

  const requiresPasswordForDeletion = user ? userHasEmailPassword(user) : false;

  const canDelete = useMemo(() => {
    const confirmationMatches = deleteConfirmText === DELETE_ACCOUNT_CONFIRM_PHRASE;
    if (!requiresPasswordForDeletion) {
      return confirmationMatches;
    }

    return (
      deletePassword.length > 0 &&
      deletePasswordConfirm.length > 0 &&
      deletePassword === deletePasswordConfirm &&
      confirmationMatches
    );
  }, [
    deleteConfirmText,
    deletePassword,
    deletePasswordConfirm,
    requiresPasswordForDeletion,
  ]);

  const themeSegmentOptions = useMemo(
    () => THEME_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );
  const mapStyleSegmentOptions = useMemo(
    () => MAP_STYLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );
  const unitSegmentOptions = useMemo(
    () => UNIT_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  useEffect(() => {
    themeFade.setValue(0.88);
    Animated.timing(themeFade, {
      toValue: 1,
      duration: motion.duration.slow,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  }, [settings.themeMode, themeFade]);

  const animateAccountPress = (toValue: number) => {
    Animated.timing(accountScale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      const result = await signOut({
        profileId: profile?.id ?? null,
        authUserId: user?.id ?? null,
      });

      // Always drop in-memory private state, even if remote signOut had issues.
      resetPlaceLikesMemory();
      resetSavedPlacesMemory();
      resetNotificationsMemory();
      await refresh();

      if (!result.success) {
        showToast(
          localizeSettingsMessage(result.error) ?? t('settings.session.signOutFailed'),
        );
        return;
      }

      showToast(t('settings.session.signedOut'));
      resetToMain(navigation);
    } catch {
      resetPlaceLikesMemory();
      resetSavedPlacesMemory();
      resetNotificationsMemory();
      await refresh();
      showToast(t('settings.session.signedOutLocal'));
      resetToMain(navigation);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || acting) {
      return;
    }

    setActing(true);
    try {
      if (confirmAction === 'clear_cache') {
        await clearCache();
        showToast(t('settings.data.cacheCleared'));
      } else {
        await resetSettings();
        showToast(t('settings.data.prefsReset'));
      }
    } catch {
      showToast(t('errors.generic'));
    } finally {
      setActing(false);
      setConfirmAction(null);
    }
  };

  const openDeleteModal = () => {
    setDeletePassword('');
    setDeletePasswordConfirm('');
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteVisible(true);
  };

  const handleDeleteAccount = async () => {
    if (!user || !canDelete || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    const result = await deleteUserAccount(
      requiresPasswordForDeletion
        ? { password: deletePassword }
        : { oauthOnly: true },
    );

    setDeleting(false);

    if (!result.success) {
      setDeleteError(
        localizeSettingsMessage(result.error) ?? t('settings.deleteAccount.errors.failed'),
      );
      return;
    }

    setDeleteVisible(false);
    resetPlaceLikesMemory();
    resetSavedPlacesMemory();
    await refresh();
    resetToMain(navigation);
    showToast(t('settings.deleteAccount.success'));
  };

  const openMail = (subject: string) => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`);
  };

  return (
    <ScreenContainer scrollable safeTop={false} reserveFloatingTabBar contentStyle={settingsStyles.content}>
      {toastMessage ? (
        <ToastBanner
          message={toastMessage}
          visible={toastMessage != null}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}

      <Animated.View style={{ opacity: themeFade, gap: spacing.lg }}>
      <SettingsSection title={t('settings.sections.account')} entranceIndex={0}>
        {isGuest ? (
          <View style={styles.accountGuest}>
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              {t('settings.account.unlockHint')}
            </Text>
            <AppButton
              title={t('common.signIn')}
              onPress={() => navigateToAuth(navigation)}
              fullWidth={false}
            />
          </View>
        ) : (
          <View style={styles.accountSignedIn}>
            <Animated.View style={{ transform: [{ scale: accountScale }] }}>
              <Pressable
                style={styles.accountRow}
                onPress={() => navigation.navigate(PROFILE_ROUTES.SETTINGS_ACCOUNT)}
                onPressIn={() => animateAccountPress(motion.scale.cardPress)}
                onPressOut={() => animateAccountPress(1)}
                accessibilityRole="button"
              >
                <ProfileAvatar
                  displayName={displayName}
                  avatarUrl={profile?.avatar_url}
                  profileId={profile?.id}
                  authUserId={user?.id}
                  previousStoragePath={profile?.avatar_storage_path}
                  size={52}
                  editable={false}
                />
                <View style={styles.accountText}>
                  <Text style={[styles.accountName, { color: colors.textPrimary }]}>{displayName}</Text>
                  <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                    {user?.email ?? t('settings.account.signedIn')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
            <SettingsLinkRow
              label={t('settings.account.changePassword')}
              subtitle={t('settings.account.changePasswordSubtitle')}
              onPress={() => navigation.navigate(PROFILE_ROUTES.CHANGE_PASSWORD)}
            />
            <SettingsLinkRow
              label={t('settings.account.changeEmail')}
              subtitle={t('settings.account.changeEmailSubtitle')}
              onPress={() => navigation.navigate(PROFILE_ROUTES.CHANGE_EMAIL)}
            />
          </View>
        )}
      </SettingsSection>

      <SettingsSection title={t('settings.appPreferences')} entranceIndex={1}>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>
          {t('settings.theme.title')}
        </Text>
        <SettingsSegmentedControl
          options={themeSegmentOptions}
          value={settings.themeMode}
          onChange={(value) =>
            void updateSettings((current) => ({ ...current, themeMode: value })).then(() => {
              const labelKey =
                THEME_OPTIONS.find((option) => option.value === value)?.labelKey;
              showToast(
                t('settings.theme.setTo', {
                  label: labelKey ? t(labelKey) : value,
                }),
              );
            })
          }
        />
        <SettingsLinkRow
          icon="globe-outline"
          label={t('settings.language.title')}
          subtitle={languageMeta.nativeName}
          onPress={() => navigation.navigate(PROFILE_ROUTES.SETTINGS_LANGUAGE)}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.mapPreferences')} entranceIndex={2}>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>
          {t('settings.mapStyle.title')}
        </Text>
        <SettingsSegmentedControl
          options={mapStyleSegmentOptions}
          value={settings.mapStyle}
          onChange={(value) =>
            void updateSettings((current) => ({ ...current, mapStyle: value })).then(() => {
              const labelKey =
                MAP_STYLE_OPTIONS.find((option) => option.value === value)?.labelKey;
              showToast(
                t('settings.mapStyle.setTo', {
                  label: labelKey ? t(labelKey) : value,
                }),
              );
            })
          }
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.units')} entranceIndex={3}>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>
          {t('settings.distanceUnit.title')}
        </Text>
        <SettingsSegmentedControl
          options={unitSegmentOptions}
          value={settings.distanceUnit}
          onChange={(value) =>
            void updateSettings((current) => ({
              ...current,
              distanceUnit: value,
            })).then(() => {
              const labelKey =
                UNIT_OPTIONS.find((option) => option.value === value)?.labelKey;
              showToast(
                t('settings.distanceUnit.setTo', {
                  label: labelKey ? t(labelKey) : value,
                }),
              );
            })
          }
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.notifications')} entranceIndex={4}>
        <SettingsLinkRow
          label={t('settings.notifications.prefsLink')}
          subtitle={
            preferences.pushEnabled && notification.state === 'granted'
              ? t('settings.notifications.enabledDevice', {
                  status: getPermissionStatusLabel(notification.state),
                })
              : t('settings.notifications.offDevice', {
                  status: getPermissionStatusLabel(notification.state),
                })
          }
          onPress={() => navigation.navigate(PROFILE_ROUTES.SETTINGS_NOTIFICATIONS)}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.data')} entranceIndex={5}>
        <SettingsLinkRow
          label={t('settings.data.clearCache')}
          subtitle={t('settings.data.clearCacheSubtitle')}
          onPress={() => setConfirmAction('clear_cache')}
        />
        <SettingsLinkRow
          label={t('settings.data.resetPrefs')}
          subtitle={t('settings.data.resetPrefsSubtitle')}
          onPress={() => setConfirmAction('reset_preferences')}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.support')} entranceIndex={6}>
        <SettingsLinkRow
          label={t('settings.support.contact')}
          onPress={() => openMail(t('settings.support.mailSubjectSupport'))}
        />
        <SettingsLinkRow
          label={t('settings.support.reportBug')}
          onPress={() => openMail(t('settings.support.mailSubjectBug'))}
        />
        <SettingsLinkRow
          label={t('settings.support.privacyPolicy')}
          onPress={() => setLegalContentId('privacy')}
        />
        <SettingsLinkRow
          label={t('settings.support.termsOfService')}
          onPress={() => setLegalContentId('terms')}
        />
        <SettingsLinkRow
          label={t('settings.support.aboutNicePlace')}
          onPress={() => setLegalContentId('about')}
        />
        <Text style={[settingsStyles.versionLabel, { color: colors.textSecondary }]}>
          {t('settings.support.appVersion')}
        </Text>
        <Text style={[settingsStyles.versionValue, { color: colors.textPrimary }]}>
          {APP_VERSION}
        </Text>
      </SettingsSection>

      <SettingsSection title={t('settings.sections.accountActions')} entranceIndex={7}>
        {isGuest ? (
          <AppButton title={t('common.signIn')} onPress={() => navigateToAuth(navigation)} />
        ) : (
          <AppButton
            title={
              loggingOut || authLoading
                ? t('settings.session.signingOut')
                : t('settings.session.signOut')
            }
            variant="secondary"
            onPress={handleLogout}
            disabled={loggingOut || authLoading}
          />
        )}
      </SettingsSection>

      {!isGuest ? (
        <ProfileEntranceBlock index={8}>
        <View style={styles.dangerZone}>
          <Text style={[styles.dangerTitle, { color: colors.error }]}>
            {t('settings.deleteAccount.dangerTitle')}
          </Text>
          <View
            style={[
              styles.dangerCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.error,
              },
            ]}
          >
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              {t('settings.deleteAccount.dangerBody')}
            </Text>
            <Pressable
              onPress={openDeleteModal}
              style={[styles.deleteButton, { backgroundColor: colors.error }]}
              accessibilityRole="button"
              accessibilityLabel={t('settings.deleteAccount.a11yDelete')}
            >
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={[styles.deleteButtonLabel, { color: colors.white }]}>
                {t('settings.deleteAccount.delete')}
              </Text>
            </Pressable>
          </View>
        </View>
        </ProfileEntranceBlock>
      ) : null}
      </Animated.View>

      <LegalInfoModal
        visible={legalContentId != null}
        content={legalContentId ? getLegalContent(legalContentId) : null}
        onClose={() => setLegalContentId(null)}
      />

      <FeedbackModal
        visible={confirmAction != null}
        variant="error"
        title={
          confirmAction === 'clear_cache'
            ? t('settings.data.clearConfirmTitle')
            : t('settings.data.resetConfirmTitle')
        }
        subtitle={
          confirmAction === 'clear_cache'
            ? t('settings.data.clearConfirmBody')
            : t('settings.data.resetConfirmBody')
        }
        primaryLabel={
          acting
            ? t('settings.data.working')
            : confirmAction === 'clear_cache'
              ? t('settings.data.clearConfirmAction')
              : t('settings.data.resetConfirmAction')
        }
        onPrimary={() => {
          if (!acting) {
            void handleConfirmAction();
          }
        }}
        secondaryLabel={t('common.cancel')}
        onSecondary={() => {
          if (!acting) {
            setConfirmAction(null);
          }
        }}
      />

      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setDeleteVisible(false)}
      >
        <View style={styles.deleteOverlay}>
          <Pressable
            style={[styles.deleteBackdrop, { backgroundColor: colors.scrimHeavy }]}
            onPress={() => setDeleteVisible(false)}
            accessibilityLabel={t('settings.deleteAccount.a11yDismiss')}
          />
          <View
            style={[
              styles.deleteSheet,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.error,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
          >
            <Text style={[styles.deleteTitle, { color: colors.error }]}>
              {t('settings.deleteAccount.title')}
            </Text>
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              {requiresPasswordForDeletion
                ? t('settings.deleteAccount.instructionPassword', {
                    phrase: DELETE_ACCOUNT_CONFIRM_PHRASE,
                  })
                : t('settings.deleteAccount.instructionOAuth', {
                    phrase: DELETE_ACCOUNT_CONFIRM_PHRASE,
                  })}
            </Text>

            {requiresPasswordForDeletion ? (
              <>
                <AppTextInput
                  label={t('auth.login.passwordLabel')}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  autoComplete="password"
                  placeholder={t('auth.login.passwordPlaceholder')}
                />
                <AppTextInput
                  label={t('settings.deleteAccount.confirmPassword')}
                  value={deletePasswordConfirm}
                  onChangeText={setDeletePasswordConfirm}
                  secureTextEntry
                  autoComplete="password"
                  placeholder={t('auth.login.passwordPlaceholder')}
                />
              </>
            ) : null}
            <AppTextInput
              label={t('settings.deleteAccount.confirmLabel', {
                phrase: DELETE_ACCOUNT_CONFIRM_PHRASE,
              })}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              placeholder={DELETE_ACCOUNT_CONFIRM_PHRASE}
            />

            {requiresPasswordForDeletion &&
            deletePassword &&
            deletePasswordConfirm &&
            deletePassword !== deletePasswordConfirm ? (
              <Text style={[settingsStyles.error, { color: colors.error }]}>
                {t('settings.deleteAccount.passwordsDoNotMatch')}
              </Text>
            ) : null}

            {deleteError ? (
              <Text style={[settingsStyles.error, { color: colors.error }]}>{deleteError}</Text>
            ) : null}

            <AppButton
              title={
                deleting
                  ? t('settings.deleteAccount.deleting')
                  : t('settings.deleteAccount.deleteAction')
              }
              onPress={handleDeleteAccount}
              disabled={!canDelete || deleting}
              style={{ backgroundColor: colors.error, borderColor: colors.error }}
            />
            <AppButton
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => setDeleteVisible(false)}
              disabled={deleting}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  accountGuest: {
    gap: spacing.md,
  },
  accountSignedIn: {
    gap: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    ...typography.title,
  },
  accountEmail: {
    ...typography.caption,
  },
  dangerZone: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dangerTitle: {
    ...typography.screenTitle,
  },
  dangerCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  deleteButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteButtonLabel: {
    ...typography.button,
  },
  deleteOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deleteBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  deleteSheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  deleteTitle: {
    ...typography.h3,
  },
});
