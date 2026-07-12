import { devWarn } from '../utils/devLog';

import { signOut } from './authService';
import { getSupabase } from './supabase';

export interface DeleteAccountInput {
  password?: string;
  oauthOnly?: boolean;
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Deletes the Supabase Auth user via the delete-account Edge Function.
 * Requires the function to be deployed on the Supabase project.
 */
export async function deleteUserAccount(input: DeleteAccountInput): Promise<DeleteAccountResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }

  const oauthOnly = input.oauthOnly === true;
  const password = input.password ?? '';

  if (!oauthOnly && !password) {
    return { success: false, error: 'settings.deleteAccount.errors.passwordRequired' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user;

  if (!sessionUser) {
    return { success: false, error: 'settings.deleteAccount.errors.sessionInvalid' };
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: oauthOnly ? { oauthOnly: true } : { password },
  });

  if (error) {
    devWarn('[Nice Place Settings] delete-account invoke failed:', error.message);
    const message = error.message.toLowerCase();
    if (message.includes('function') || message.includes('404') || message.includes('not found')) {
      return {
        success: false,
        error: 'settings.deleteAccount.errors.unavailable',
      };
    }
    return { success: false, error: 'settings.deleteAccount.errors.failed' };
  }

  const payload = data as { success?: boolean; error?: string } | null;

  if (!payload?.success) {
    // Prefer stable keys; map common backend English codes if present.
    const backend = payload?.error?.toLowerCase() ?? '';
    if (backend.includes('password') || backend.includes('credentials')) {
      return { success: false, error: 'settings.deleteAccount.errors.passwordRequired' };
    }
    return {
      success: false,
      error: 'settings.deleteAccount.errors.failed',
    };
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', sessionUser.id)
    .maybeSingle();

  await signOut({
    profileId: (profileRow?.id as string | undefined) ?? null,
    authUserId: sessionUser.id,
  });

  return { success: true };
}
