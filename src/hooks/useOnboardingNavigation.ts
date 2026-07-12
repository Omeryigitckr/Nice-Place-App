import { useCallback } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROOT_ROUTES } from '../constants';
import { resetToMain } from '../navigation/navigationHelpers';
import { RootStackParamList } from '../types';
import { setOnboardingComplete } from '../utils/storage';

type OnboardingNavigation = NativeStackNavigationProp<
  RootStackParamList,
  typeof ROOT_ROUTES.ONBOARDING
>;

export function useOnboardingNavigation(navigation: OnboardingNavigation) {
  const finishOnboarding = useCallback(async () => {
    await setOnboardingComplete();
    resetToMain(navigation);
  }, [navigation]);

  return { finishOnboarding };
}
