import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { AUTH_CALLBACK_REDIRECT } from '../constants/authRedirect';
import { authErrorKey, resolveAuthErrorKey } from '../utils/authErrors';
import { devWarn } from '../utils/devLog';

import { processAuthCallbackUrl } from './authCallbackService';
import { AuthResult, getOrCreateProfileForUser } from './authService';
import { getSupabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

function randomNonce(length = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

async function finalizeSocialSignIn(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    return { success: false, error: authErrorKey('auth.errors.signInIncomplete') };
  }

  await getOrCreateProfileForUser(user);
  return { success: true };
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_CALLBACK_REDIRECT,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    devWarn('[Nice Place Auth] Google OAuth start failed:', error?.message);
    return { success: false, error: resolveAuthErrorKey(error, 'auth.errors.googleStartFailed') };
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_REDIRECT);

  if (browserResult.type !== 'success' || !browserResult.url) {
    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      return { success: false, error: authErrorKey('auth.errors.googleCancelled') };
    }
    return { success: false, error: authErrorKey('auth.errors.googleFailed') };
  }

  const callback = await processAuthCallbackUrl(browserResult.url);
  if (!callback.success) {
    return { success: false, error: callback.error ?? authErrorKey('auth.errors.googleFailed') };
  }

  return finalizeSocialSignIn();
}

export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: authErrorKey('auth.errors.appleOnlyIos') };
  }

  const available = await isAppleSignInAvailable();
  if (!available) {
    return { success: false, error: authErrorKey('auth.errors.appleUnavailable') };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { success: false, error: authErrorKey('auth.errors.appleNoToken') };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      devWarn('[Nice Place Auth] Apple sign-in failed:', error.message);
      return { success: false, error: resolveAuthErrorKey(error, 'auth.errors.appleFailed') };
    }

    if (credential.fullName) {
      const nameParts = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ].filter((part): part is string => Boolean(part));
      const fullName = nameParts.join(' ').trim();
      if (fullName && !data.user?.user_metadata?.full_name) {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
    }

    const user = data.user ?? (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
      return { success: false, error: authErrorKey('auth.errors.appleFailed') };
    }

    await getOrCreateProfileForUser(user);
    return { success: true };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (code === 'ERR_REQUEST_CANCELED') {
      return { success: false, error: authErrorKey('auth.errors.appleCancelled') };
    }

    devWarn('[Nice Place Auth] Apple sign-in error:', code || 'unknown');
    return { success: false, error: authErrorKey('auth.errors.appleFailed') };
  }
}
