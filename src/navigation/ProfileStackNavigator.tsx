import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PROFILE_ROUTES } from '../constants';
import { ProfileScreen } from '../screens';
import {
  AdminNotificationBroadcastScreen,
  AdminPanelScreen,
  AdminPlaceDetailScreen,
  AdminReportedProfileDetailScreen,
  AdminReportedProfilesScreen,
  AdminUpdateRequestDetailScreen,
} from '../screens/admin';
import {
  SettingsAboutScreen,
  SettingsAccountScreen,
  SettingsAppearanceScreen,
  ChangePasswordScreen,
  ChangeEmailScreen,
  LanguageSettingsScreen,
  SettingsHomeScreen,
  SettingsNotificationsScreen,
  SettingsPrivacyLocationScreen,
} from '../screens/settings';
import { typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { ProfileStackParamList } from '../types';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          ...typography.screenTitle,
          fontSize: 17,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name={PROFILE_ROUTES.PROFILE_HOME}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS}
        component={SettingsHomeScreen}
        options={{
          title: t('navigation.settings'),
          headerBackTitle: t('navigation.profile'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_ACCOUNT}
        component={SettingsAccountScreen}
        options={{ title: t('navigation.account'), headerBackTitle: t('navigation.settings') }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.CHANGE_PASSWORD}
        component={ChangePasswordScreen}
        options={{
          title: t('navigation.changePassword'),
          headerBackTitle: t('navigation.settings'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.CHANGE_EMAIL}
        component={ChangeEmailScreen}
        options={{
          title: t('navigation.changeEmail'),
          headerBackTitle: t('navigation.settings'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_APPEARANCE}
        component={SettingsAppearanceScreen}
        options={{
          title: t('navigation.appearance'),
          headerBackTitle: t('navigation.settings'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_LANGUAGE}
        component={LanguageSettingsScreen}
        options={{
          title: t('navigation.language'),
          headerBackTitle: t('navigation.settings'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_NOTIFICATIONS}
        component={SettingsNotificationsScreen}
        options={{
          title: t('navigation.notifications'),
          headerBackTitle: t('navigation.settings'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_PRIVACY_LOCATION}
        component={SettingsPrivacyLocationScreen}
        options={{
          title: t('navigation.privacyLocation'),
          headerBackTitle: t('navigation.settings'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_ABOUT}
        component={SettingsAboutScreen}
        options={{ title: t('navigation.about'), headerBackTitle: t('navigation.settings') }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_PANEL}
        component={AdminPanelScreen}
        options={{ title: t('navigation.adminPanel'), headerBackTitle: t('navigation.profile') }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_NOTIFICATION_BROADCAST}
        component={AdminNotificationBroadcastScreen}
        options={{
          title: t('navigation.sendNotification'),
          headerBackTitle: t('navigation.admin'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_REPORTED_PROFILES}
        component={AdminReportedProfilesScreen}
        options={{
          title: t('navigation.reportedProfiles'),
          headerBackTitle: t('navigation.admin'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_REPORTED_PROFILE_DETAIL}
        component={AdminReportedProfileDetailScreen}
        options={{
          title: t('navigation.reviewProfile'),
          headerBackTitle: t('navigation.reports'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_PLACE_DETAIL}
        component={AdminPlaceDetailScreen}
        options={{
          title: t('navigation.reviewPlace'),
          headerBackTitle: t('navigation.admin'),
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_UPDATE_REQUEST}
        component={AdminUpdateRequestDetailScreen}
        options={{
          title: t('navigation.reviewUpdate'),
          headerBackTitle: t('navigation.admin'),
        }}
      />
    </Stack.Navigator>
  );
}
