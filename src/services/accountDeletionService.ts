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
    return { success: false, error: 'Supabase is not configured.' };
  }

  const oauthOnly = input.oauthOnly === true;
  const password = input.password ?? '';

  if (!oauthOnly && !password) {
    return { success: false, error: 'Password is required.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user;

  if (!sessionUser) {
    return { success: false, error: 'Could not verify your session.' };
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
        error: 'Account deletion is not available yet. Contact support@niceplace.site.',
      };
    }
    return { success: false, error: 'Could not delete account. Please try again.' };
  }

  const payload = data as { success?: boolean; error?: string } | null;

  if (!payload?.success) {
    return {
      success: false,
      error: payload?.error ?? 'Could not delete account. Please try again.',
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
