import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROOT_ROUTES } from '../constants';
import {
  LocationPermissionScreen,
  OnboardingScreen,
  SplashScreen,
} from '../screens';
import { useThemeColors } from '../theme/ThemeContext';
import { RootStackParamList } from '../types';

import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      initialRouteName={ROOT_ROUTES.SPLASH}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name={ROOT_ROUTES.SPLASH} component={SplashScreen} />
      <Stack.Screen name={ROOT_ROUTES.ONBOARDING} component={OnboardingScreen} />
      <Stack.Screen name={ROOT_ROUTES.AUTH} component={AuthNavigator} />
      <Stack.Screen
        name={ROOT_ROUTES.LOCATION_PERMISSION}
        component={LocationPermissionScreen}
      />
      <Stack.Screen name={ROOT_ROUTES.MAIN} component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
