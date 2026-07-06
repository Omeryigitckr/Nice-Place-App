import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native';

import { ROOT_ROUTES } from '../constants';

export function getRootNavigation(
  navigation: NavigationProp<ParamListBase>,
): NavigationProp<ParamListBase> {
  let root: NavigationProp<ParamListBase> = navigation;

  while (root.getParent()) {
    root = root.getParent()!;
  }

  return root;
}

export function resetToRoute(
  navigation: NavigationProp<ParamListBase>,
  routeName: string,
) {
  const root = getRootNavigation(navigation);

  root.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName }],
    }),
  );
}

export function resetToMain(navigation: NavigationProp<ParamListBase>) {
  resetToRoute(navigation, ROOT_ROUTES.MAIN);
}

export function resetToAuth(navigation: NavigationProp<ParamListBase>) {
  resetToRoute(navigation, ROOT_ROUTES.AUTH);
}

export function resetToLocationPermission(navigation: NavigationProp<ParamListBase>) {
  resetToRoute(navigation, ROOT_ROUTES.LOCATION_PERMISSION);
}
