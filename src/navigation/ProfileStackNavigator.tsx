import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PROFILE_ROUTES } from '../constants';
import { ProfileScreen } from '../screens';
import {
  AdminPanelScreen,
  AdminPlaceDetailScreen,
  AdminUpdateRequestDetailScreen,
} from '../screens/admin';
import {
  SettingsAboutScreen,
  SettingsAccountScreen,
  SettingsAppearanceScreen,
  ChangePasswordScreen,
  ChangeEmailScreen,
  SettingsHomeScreen,
  SettingsNotificationsScreen,
  SettingsPrivacyLocationScreen,
} from '../screens/settings';
import { typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { ProfileStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  const colors = useThemeColors();

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
          title: 'Settings',
          headerBackTitle: 'Profile',
        }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_ACCOUNT}
        component={SettingsAccountScreen}
        options={{ title: 'Account', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.CHANGE_PASSWORD}
        component={ChangePasswordScreen}
        options={{ title: 'Change Password', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.CHANGE_EMAIL}
        component={ChangeEmailScreen}
        options={{ title: 'Change Email', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_APPEARANCE}
        component={SettingsAppearanceScreen}
        options={{ title: 'Appearance', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_NOTIFICATIONS}
        component={SettingsNotificationsScreen}
        options={{ title: 'Notifications', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_PRIVACY_LOCATION}
        component={SettingsPrivacyLocationScreen}
        options={{ title: 'Privacy & Location', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.SETTINGS_ABOUT}
        component={SettingsAboutScreen}
        options={{ title: 'About', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_PANEL}
        component={AdminPanelScreen}
        options={{ title: 'Admin Panel', headerBackTitle: 'Profile' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_PLACE_DETAIL}
        component={AdminPlaceDetailScreen}
        options={{ title: 'Review place', headerBackTitle: 'Admin' }}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.ADMIN_UPDATE_REQUEST}
        component={AdminUpdateRequestDetailScreen}
        options={{ title: 'Review update', headerBackTitle: 'Admin' }}
      />
    </Stack.Navigator>
  );
}
