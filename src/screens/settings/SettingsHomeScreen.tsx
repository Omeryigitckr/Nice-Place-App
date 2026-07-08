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
import { useAppSettings, useAuth } from '../../hooks';
import { resetPlaceLikesMemory } from '../../hooks/usePlaceLikes';
import { resetSavedPlacesMemory } from '../../hooks/useSavedPlaces';
import { resetToMain } from '../../navigation/navigationHelpers';
import { deleteUserAccount, signOut } from '../../services';
import {
  notificationStatusLabel,
} from '../../services/notificationSettingsService';
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
import { userHasEmailPassword } from '../../utils/userAccount';
import {
  APP_VERSION,
  LEGAL_CONTENT,
  PreferenceToggle,
  SettingsLinkRow,
  SettingsSection,
  SettingsSegmentedControl,
  SUPPORT_EMAIL,
  settingsStyles,
} from './settingsShared';
import { LegalInfoContent } from '../../components/LegalInfoModal';


type Props = NativeStackScreenProps<ProfileStackParamList, typeof PROFILE_ROUTES.SETTINGS>;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const MAP_STYLE_OPTIONS: { value: MapStylePreference; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'outdoors', label: 'Outdoors' },
];

const UNIT_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'Kilometers' },
  { value: 'mi', label: 'Miles' },
];

const DELETE_CONFIRM_TEXT = 'DELETE MY ACCOUNT';

type ConfirmAction = 'clear_cache' | 'reset_preferences' | null;

export function SettingsHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { user, profile, loading: authLoading, refresh } = useAuth();
  const {
    settings,
    loading: settingsLoading,
    updateSettings,
    resetSettings,
    clearCache,
  } = useAppSettings();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [legalContent, setLegalContent] = useState<LegalInfoContent | null>(null);
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
    'Explorer';

  const showToast = (message: string) => setToastMessage(message);

  const requiresPasswordForDeletion = user ? userHasEmailPassword(user) : false;

  const canDelete = useMemo(() => {
    const confirmationMatches = deleteConfirmText === DELETE_CONFIRM_TEXT;
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
      await refresh();

      if (!result.success) {
        showToast(result.error ?? 'Logout failed.');
        return;
      }

      showToast('Signed out. You can keep browsing as a guest.');
      resetToMain(navigation);
    } catch {
      resetPlaceLikesMemory();
      resetSavedPlacesMemory();
      await refresh();
      showToast('Signed out locally. You can keep browsing as a guest.');
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
        showToast('Local cache cleared.');
      } else {
        await resetSettings();
        showToast('App preferences reset.');
      }
    } catch {
      showToast('Something went wrong. Please try again.');
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
      setDeleteError(result.error ?? 'Could not delete account.');
      return;
    }

    setDeleteVisible(false);
    resetPlaceLikesMemory();
    resetSavedPlacesMemory();
    await refresh();
    resetToMain(navigation);
    showToast('Your account has been deleted.');
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
      <SettingsSection title="Account" entranceIndex={0}>
        {isGuest ? (
          <View style={styles.accountGuest}>
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              Sign in to unlock account features
            </Text>
            <AppButton
              title="Sign in"
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
                    {user?.email ?? 'Signed in'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
            <SettingsLinkRow
              label="Change password"
              subtitle="Update your sign-in password"
              onPress={() => navigation.navigate(PROFILE_ROUTES.CHANGE_PASSWORD)}
            />
            <SettingsLinkRow
              label="Change email"
              subtitle="Update your account email"
              onPress={() => navigation.navigate(PROFILE_ROUTES.CHANGE_EMAIL)}
            />
          </View>
        )}
      </SettingsSection>

      <SettingsSection title="App preferences" entranceIndex={1}>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>Theme</Text>
        <SettingsSegmentedControl
          options={THEME_OPTIONS}
          value={settings.themeMode}
          onChange={(value) =>
            void updateSettings((current) => ({ ...current, themeMode: value })).then(() => {
              const label = THEME_OPTIONS.find((option) => option.value === value)?.label ?? value;
              showToast(`Theme set to ${label}.`);
            })
          }
        />
      </SettingsSection>

      <SettingsSection title="Map preferences" entranceIndex={2}>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>
          Default map style
        </Text>
        <SettingsSegmentedControl
          options={MAP_STYLE_OPTIONS}
          value={settings.mapStyle}
          onChange={(value) =>
            void updateSettings((current) => ({ ...current, mapStyle: value })).then(() => {
              const label =
                MAP_STYLE_OPTIONS.find((option) => option.value === value)?.label ?? value;
              showToast(`Map style set to ${label}.`);
            })
          }
        />
      </SettingsSection>

      <SettingsSection title="Units" entranceIndex={3}>
        <Text style={[settingsStyles.groupLabel, { color: colors.textPrimary }]}>Distance unit</Text>
        <SettingsSegmentedControl
          options={UNIT_OPTIONS}
          value={settings.distanceUnit}
          onChange={(value) =>
            void updateSettings((current) => ({
              ...current,
              distanceUnit: value,
            })).then(() => {
              const label = UNIT_OPTIONS.find((option) => option.value === value)?.label ?? value;
              showToast(`Distance unit set to ${label}.`);
            })
          }
        />
      </SettingsSection>

      <SettingsSection title="Notifications" entranceIndex={4}>
        <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
          Push notifications are coming soon in a future beta update.
        </Text>
        <Text style={[settingsStyles.statusLabel, { color: colors.textSecondary }]}>
          Status: {notificationStatusLabel('disabled')}
        </Text>
        <PreferenceToggle
          label="Update request status notifications"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
        <PreferenceToggle
          label="New nearby places notifications"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
        <PreferenceToggle
          label="Saved place reminders"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
      </SettingsSection>

      <SettingsSection title="Data" entranceIndex={5}>
        <SettingsLinkRow
          label="Clear local cache"
          subtitle="Removes locally cached saved-place ids"
          onPress={() => setConfirmAction('clear_cache')}
        />
        <SettingsLinkRow
          label="Reset app preferences"
          subtitle="Restore default theme, map, units, and toggles"
          onPress={() => setConfirmAction('reset_preferences')}
        />
      </SettingsSection>

      <SettingsSection title="Support" entranceIndex={6}>
        <SettingsLinkRow label="Contact support" onPress={() => openMail('Nice Place support')} />
        <SettingsLinkRow label="Report a bug" onPress={() => openMail('Nice Place bug report')} />
        <SettingsLinkRow
          label="Privacy Policy"
          onPress={() => setLegalContent(LEGAL_CONTENT.privacy)}
        />
        <SettingsLinkRow
          label="Terms of Service"
          onPress={() => setLegalContent(LEGAL_CONTENT.terms)}
        />
        <SettingsLinkRow
          label="About Nice Place"
          onPress={() => setLegalContent(LEGAL_CONTENT.about)}
        />
        <Text style={[settingsStyles.versionLabel, { color: colors.textSecondary }]}>
          App version
        </Text>
        <Text style={[settingsStyles.versionValue, { color: colors.textPrimary }]}>
          {APP_VERSION}
        </Text>
      </SettingsSection>

      <SettingsSection title="Account actions" entranceIndex={7}>
        {isGuest ? (
          <AppButton title="Sign in" onPress={() => navigateToAuth(navigation)} />
        ) : (
          <AppButton
            title={loggingOut || authLoading ? 'Signing out…' : 'Log out'}
            variant="secondary"
            onPress={handleLogout}
            disabled={loggingOut || authLoading}
          />
        )}
      </SettingsSection>

      {!isGuest ? (
        <ProfileEntranceBlock index={8}>
        <View style={styles.dangerZone}>
          <Text style={[styles.dangerTitle, { color: colors.error }]}>Danger Zone</Text>
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
              Permanently delete your account and anonymize profile data. This cannot be undone.
            </Text>
            <Pressable
              onPress={openDeleteModal}
              style={[styles.deleteButton, { backgroundColor: colors.error }]}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={[styles.deleteButtonLabel, { color: colors.white }]}>Delete Account</Text>
            </Pressable>
          </View>
        </View>
        </ProfileEntranceBlock>
      ) : null}
      </Animated.View>

      <LegalInfoModal
        visible={legalContent != null}
        content={legalContent}
        onClose={() => setLegalContent(null)}
      />

      <FeedbackModal
        visible={confirmAction != null}
        variant="error"
        title={confirmAction === 'clear_cache' ? 'Clear local cache?' : 'Reset preferences?'}
        subtitle={
          confirmAction === 'clear_cache'
            ? 'This removes locally cached data on this device. Your account and cloud data stay intact.'
            : 'This restores default theme, map style, units, and notification toggles.'
        }
        primaryLabel={acting ? 'Working…' : confirmAction === 'clear_cache' ? 'Clear cache' : 'Reset'}
        onPrimary={() => {
          if (!acting) {
            void handleConfirmAction();
          }
        }}
        secondaryLabel="Cancel"
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
            accessibilityLabel="Dismiss"
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
            <Text style={[styles.deleteTitle, { color: colors.error }]}>Delete Account</Text>
            <Text style={[settingsStyles.helperText, { color: colors.textMuted }]}>
              {requiresPasswordForDeletion
                ? `Enter your password twice and type ${DELETE_CONFIRM_TEXT} to confirm.`
                : `Type ${DELETE_CONFIRM_TEXT} to permanently delete your account.`}
            </Text>

            {requiresPasswordForDeletion ? (
              <>
                <AppTextInput
                  label="Password"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  autoComplete="password"
                  placeholder="••••••••"
                />
                <AppTextInput
                  label="Confirm password"
                  value={deletePasswordConfirm}
                  onChangeText={setDeletePasswordConfirm}
                  secureTextEntry
                  autoComplete="password"
                  placeholder="••••••••"
                />
              </>
            ) : null}
            <AppTextInput
              label={`Type ${DELETE_CONFIRM_TEXT}`}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              placeholder={DELETE_CONFIRM_TEXT}
            />

            {requiresPasswordForDeletion &&
            deletePassword &&
            deletePasswordConfirm &&
            deletePassword !== deletePasswordConfirm ? (
              <Text style={[settingsStyles.error, { color: colors.error }]}>
                Passwords do not match.
              </Text>
            ) : null}

            {deleteError ? (
              <Text style={[settingsStyles.error, { color: colors.error }]}>{deleteError}</Text>
            ) : null}

            <AppButton
              title={deleting ? 'Deleting…' : 'Delete my account'}
              onPress={handleDeleteAccount}
              disabled={!canDelete || deleting}
              style={{ backgroundColor: colors.error, borderColor: colors.error }}
            />
            <AppButton
              title="Cancel"
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
