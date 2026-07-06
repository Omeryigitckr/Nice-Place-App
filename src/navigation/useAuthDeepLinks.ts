import { useEffect } from 'react';
import { Linking } from 'react-native';

import { getSupabase, isAuthCallbackUrl } from '../services';

import { stashAuthCallbackUrl } from './authCallbackBridge';
import { navigateToAuthCallbackScreen, navigateToResetPasswordScreen } from './navigationRef';

async function handleIncomingAuthUrl(url: string | null): Promise<void> {
  if (!url || !isAuthCallbackUrl(url)) {
    return;
  }

  stashAuthCallbackUrl(url);
  navigateToAuthCallbackScreen();
}

export function useAuthDeepLinks() {
  useEffect(() => {
    let mounted = true;

    void Linking.getInitialURL().then((url) => {
      if (mounted) {
        void handleIncomingAuthUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingAuthUrl(url);
    });

    const supabase = getSupabase();
    const authSubscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigateToResetPasswordScreen();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
      authSubscription?.data.subscription.unsubscribe();
    };
  }, []);
}
