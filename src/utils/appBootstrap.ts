import { ROOT_ROUTES } from '../constants';

import { isOnboardingComplete } from './storage';

export type BootstrapRoute =
  | typeof ROOT_ROUTES.MAIN
  | typeof ROOT_ROUTES.ONBOARDING;

/**
 * Guests may enter the app without signing in.
 * Auth is only required for protected actions (add/edit/save/admin).
 */
export async function resolveBootstrapRoute(): Promise<BootstrapRoute> {
  const onboardingDone = await isOnboardingComplete();

  if (!onboardingDone) {
    return ROOT_ROUTES.ONBOARDING;
  }

  return ROOT_ROUTES.MAIN;
}
