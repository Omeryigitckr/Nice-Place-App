import { ROOT_ROUTES } from '../constants';
import { getCurrentSession } from '../services/authService';
import { devLog } from './devLog';

import { isOnboardingComplete } from './storage';

export type BootstrapRoute =
  | typeof ROOT_ROUTES.MAIN
  | typeof ROOT_ROUTES.ONBOARDING;

/**
 * Guests may enter the app without signing in.
 * Auth is only required for protected actions (add/edit/save/admin).
 */
export async function resolveBootstrapRoute(): Promise<BootstrapRoute> {
  const session = await getCurrentSession();
  devLog('[Nice Place Auth] session loaded', session?.user?.id ?? null);

  const onboardingDone = await isOnboardingComplete();

  if (!onboardingDone) {
    return ROOT_ROUTES.ONBOARDING;
  }

  if (!session) {
    devLog('[Nice Place Auth] guest mode enabled');
  }

  return ROOT_ROUTES.MAIN;
}
