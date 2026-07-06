import { devWarn } from '../utils/devLog';

import { signOut } from './authService';
import { getSupabase } from './supabase';

export interface DeleteAccountInput {
  email: string;
  password: string;
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Client-side account deletion is intentionally limited.
 * Supabase does not allow end-users to delete auth.users from the anon key.
 * A secure Edge Function / admin API is required for full deletion.
 */
export async function deleteUserAccount(input: DeleteAccountInput): Promise<DeleteAccountResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const email = input.email.trim();
  const password = input.password;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Re-authenticate to prove password ownership.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { success: false, error: authError.message || 'Password verification failed.' };
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return { success: false, error: 'Could not verify your session.' };
  }

  // Best-effort anonymize profile data the client is allowed to update.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: 'Deleted User',
      username: `deleted_${user.id.slice(0, 8)}`,
      bio: null,
      avatar_url: null,
      avatar_storage_path: null,
    })
    .eq('auth_user_id', user.id);

  if (profileError) {
    devWarn('[Nice Place Settings] profile anonymize failed:', profileError.message);
  }

  // Auth user deletion requires a privileged server function.
  devWarn(
    '[Nice Place Settings] auth.users delete is not available from the client. Needs Edge Function.',
  );

  // Best-effort local logout so private cache is not left behind.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  await signOut({
    profileId: (profileRow?.id as string | undefined) ?? null,
    authUserId: user.id,
  });

  return {
    success: false,
    error: 'Account deletion requires server function',
  };
}
