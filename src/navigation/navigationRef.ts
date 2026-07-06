import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

import { AUTH_ROUTES, ROOT_ROUTES } from '../constants';
import { RootStackParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToAuthCallbackScreen() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: ROOT_ROUTES.AUTH,
      params: {
        screen: AUTH_ROUTES.AUTH_CALLBACK,
      },
    }),
  );
}

export function navigateToResetPasswordScreen() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: ROOT_ROUTES.AUTH,
      params: {
        screen: AUTH_ROUTES.RESET_PASSWORD,
      },
    }),
  );
}
