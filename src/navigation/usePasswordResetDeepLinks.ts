import { useEffect } from 'react';
import { Linking } from 'react-native';

import { isAuthCallbackUrl, processAuthCallbackUrl } from '../services/authCallbackService';
import { getSupabase } from '../services/supabase';
import { devWarn } from '../utils/devLog';

import { navigateToResetPasswordScreen } from './navigationRef';

async function handlePasswordResetUrl(url: string | null) {
  if (!url || !isAuthCallbackUrl(url)) {
    return;
  }

  const result = await processAuthCallbackUrl(url);
  if (!result.success) {
    devWarn('[Nice Place Auth] password reset deep link failed:', result.error);
    return;
  }

  if (result.flow === 'recovery') {
    navigateToResetPasswordScreen();
  }
}

export function usePasswordResetDeepLinks() {
  useEffect(() => {
    let mounted = true;

    void Linking.getInitialURL().then((url) => {
      if (mounted) {
        void handlePasswordResetUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handlePasswordResetUrl(url);
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
