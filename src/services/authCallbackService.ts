import { AUTH_CALLBACK_REDIRECT } from '../constants/authRedirect';
import { authErrorKey, resolveAuthErrorKey } from '../utils/authErrors';
import { devWarn } from '../utils/devLog';

import { AuthResult } from './authService';
import { getSupabase } from './supabase';

export type AuthCallbackFlow = 'recovery' | 'email_change' | 'unknown';

export interface AuthCallbackParams {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  code?: string;
  error?: string;
  error_description?: string;
}

export interface AuthCallbackResult extends AuthResult {
  flow?: AuthCallbackFlow;
  alreadyProcessed?: boolean;
}

const processedCallbackUrls = new Map<string, AuthCallbackFlow>();

export function isAuthCallbackUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('niceplace://auth/callback') ||
    normalized.includes('/auth/callback')
  );
}

export function parseAuthCallbackParams(url: string): AuthCallbackParams {
  const combined = new URLSearchParams();
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const queryEnd = hashIndex !== -1 ? hashIndex : url.length;

  if (queryIndex !== -1) {
    const queryParams = new URLSearchParams(url.slice(queryIndex + 1, queryEnd));
    queryParams.forEach((value, key) => {
      combined.set(key, value);
    });
  }

  if (hashIndex !== -1) {
    const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
    hashParams.forEach((value, key) => {
      combined.set(key, value);
    });
  }

  return {
    access_token: combined.get('access_token') ?? undefined,
    refresh_token: combined.get('refresh_token') ?? undefined,
    type: combined.get('type') ?? undefined,
    code: combined.get('code') ?? undefined,
    error: combined.get('error') ?? undefined,
    error_description: combined.get('error_description') ?? undefined,
  };
}

function detectAuthCallbackFlow(type?: string): AuthCallbackFlow {
  if (type === 'recovery') {
    return 'recovery';
  }
  if (type === 'email_change') {
    return 'email_change';
  }
  return 'unknown';
}

function mapAuthCallbackError(message: string): string {
  return resolveAuthErrorKey(message, 'auth.errors.linkInvalid');
}

/**
 * Parse and complete a Supabase auth callback deep link.
 * Handles PKCE `code` exchange and implicit `access_token` / `refresh_token` pairs.
 */
export async function processAuthCallbackUrl(url: string): Promise<AuthCallbackResult> {
  const normalized = url.trim();

  if (!isAuthCallbackUrl(normalized)) {
    return { success: false, error: authErrorKey('auth.errors.notAuthCallback') };
  }

  if (processedCallbackUrls.has(normalized)) {
    return {
      success: true,
      flow: processedCallbackUrls.get(normalized) ?? 'unknown',
      alreadyProcessed: true,
    };
  }

  const params = parseAuthCallbackParams(normalized);

  if (params.error) {
    const message = params.error_description ?? params.error;
    return { success: false, error: mapAuthCallbackError(message) };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      devWarn('[Nice Place Auth] code exchange failed:', error.message);
      return { success: false, error: mapAuthCallbackError(error.message) };
    }

    const flow = detectAuthCallbackFlow(params.type);
    processedCallbackUrls.set(normalized, flow);
    return { success: true, flow };
  }

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });

    if (error) {
      devWarn('[Nice Place Auth] setSession failed:', error.message);
      return { success: false, error: mapAuthCallbackError(error.message) };
    }

    const flow = detectAuthCallbackFlow(params.type);
    processedCallbackUrls.set(normalized, flow);
    return { success: true, flow };
  }

  return {
    success: false,
    error: authErrorKey('auth.errors.linkMissingData'),
  };
}

export { AUTH_CALLBACK_REDIRECT };
