import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AUTH_ROUTES } from '../constants';
import {
  AuthCallbackScreen,
  ForgotPasswordScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
} from '../screens';
import { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 280,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name={AUTH_ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={AUTH_ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={AUTH_ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={AUTH_ROUTES.AUTH_CALLBACK} component={AuthCallbackScreen} />
      <Stack.Screen name={AUTH_ROUTES.RESET_PASSWORD} component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
