import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native';

import { AUTH_ROUTES, ROOT_ROUTES, TAB_ROUTES, PROFILE_ROUTES } from '../constants';
import { showAppToast } from '../feedback';
import { i18n } from '../i18n/instance';
import { AuthCallbackResult } from '../services/authCallbackService';

import { navigationRef } from './navigationRef';

export function routeAuthCallbackResult(
  result: AuthCallbackResult,
  navigation?: NavigationProp<ParamListBase>,
): void {
  if (!result.success) {
    return;
  }

  const nav = navigation ?? (navigationRef.isReady() ? navigationRef : null);
  if (!nav) {
    return;
  }

  if (result.flow === 'recovery') {
    nav.dispatch(
      CommonActions.navigate({
        name: ROOT_ROUTES.AUTH,
        params: {
          screen: AUTH_ROUTES.RESET_PASSWORD,
        },
      }),
    );
    return;
  }

  if (result.flow === 'email_change') {
    showAppToast(i18n.t('auth.callback.emailConfirmed'));
    nav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: ROOT_ROUTES.MAIN,
            params: {
              screen: TAB_ROUTES.PROFILE,
              params: {
                screen: PROFILE_ROUTES.SETTINGS,
              },
            },
          },
        ],
      }),
    );
    return;
  }

  nav.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: ROOT_ROUTES.MAIN }],
    }),
  );
}
