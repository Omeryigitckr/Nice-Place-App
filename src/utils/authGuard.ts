import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { User } from '@supabase/supabase-js';

import { ROOT_ROUTES } from '../constants';
import { getRootNavigation } from '../navigation/navigationHelpers';

export type ProtectedAction =
  | 'add_place'
  | 'edit_place'
  | 'save_place'
  | 'like_place'
  | 'profile_action'
  | 'admin_panel';

/**
 * Returns true when the user may perform a protected action.
 * Does not block browsing — only account-based actions.
 */
export function requireAuth(
  user: User | null | undefined,
  _action: ProtectedAction,
): boolean {
  if (user) {
    return true;
  }

  return false;
}

type AnyNavigation = NavigationProp<ParamListBase> | { getParent?: () => AnyNavigation | undefined; navigate: (...args: never[]) => void };

/** Open Login/Register without wiping the main app stack. */
export function navigateToAuth(navigation: AnyNavigation) {
  const root = getRootNavigation(navigation as NavigationProp<ParamListBase>);
  root.navigate(ROOT_ROUTES.AUTH as never);
}
