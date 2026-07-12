import { CommonActions } from '@react-navigation/native';

import { MAP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '../constants';

import { navigationRef } from './navigationRef';

export function navigateFromNotificationData(data: Record<string, unknown>): void {
  if (!navigationRef.isReady()) {
    return;
  }

  const placeId = typeof data.placeId === 'string' ? data.placeId : undefined;
  const screen = typeof data.screen === 'string' ? data.screen : undefined;

  if (placeId && (screen === 'place_detail' || !screen)) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: ROOT_ROUTES.MAIN,
        params: {
          screen: TAB_ROUTES.EXPLORE,
          params: {
            screen: MAP_ROUTES.PLACE_DETAIL,
            params: { placeId },
          },
        },
      }),
    );
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: ROOT_ROUTES.MAIN,
      params: {
        screen: TAB_ROUTES.EXPLORE,
        params: {
          screen: MAP_ROUTES.NOTIFICATIONS,
        },
      },
    }),
  );
}

export function navigateToNotificationsCenter(): void {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: ROOT_ROUTES.MAIN,
      params: {
        screen: TAB_ROUTES.EXPLORE,
        params: {
          screen: MAP_ROUTES.NOTIFICATIONS,
        },
      },
    }),
  );
}
