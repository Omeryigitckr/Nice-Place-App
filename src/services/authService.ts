import { Session, User } from '@supabase/supabase-js';

import { clearUserPrivateCache } from '../cache/clearUserSession';
import { readUserProfileByAuthCache, writeUserProfileCache } from '../cache';
import { markNetworkFailure, markNetworkSuccess } from '../network';
import { DbProfile } from '../types/database';
import { devWarn } from '../utils/devLog';

import { AUTH_CALLBACK_REDIRECT } from '../constants/authRedirect';
import { authErrorKey, resolveAuthErrorKey } from '../utils/authErrors';

import { clearViewerProfileIdCache } from './placeEngagementService';
import { getSupabase } from './supabase';

/** Fields required by the app profile model — avoid select('*'). */
const PROFILE_SELECT =
  'id, auth_user_id, username, full_name, avatar_url, avatar_storage_path, bio, created_at, updated_at, trust_score, is_admin, is_banned, role, is_suspended, suspended_until, suspension_reason, moderation_strikes, username_reset_required';

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    devWarn('[Nice Place] Failed to read session:', error.message);
    return null;
  }

  return data.session;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { success: false, error: resolveAuthErrorKey(error, 'auth.errors.signInFailed') };
  }

  return { success: true };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: AUTH_CALLBACK_REDIRECT,
  });

  if (error) {
    devWarn('[Nice Place Auth] password reset request failed:', error.message);
    return { success: false, error: authErrorKey('auth.errors.resetEmailFailed') };
  }

  return { success: true };
}

export async function requestEmailChange(newEmail: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { error } = await supabase.auth.updateUser(
    { email: newEmail.trim() },
    { emailRedirectTo: AUTH_CALLBACK_REDIRECT },
  );

  if (error) {
    devWarn('[Nice Place Auth] email change request failed:', error.message);
    return { success: false, error: resolveAuthErrorKey(error, 'auth.errors.emailChangeFailed') };
  }

  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { success: false, error: resolveAuthErrorKey(error, 'auth.errors.updatePasswordFailed') };
  }

  return { success: true };
}

export async function changePasswordWithReauth(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: currentPassword,
  });

  if (authError) {
    return { success: false, error: authErrorKey('auth.errors.currentPasswordIncorrect') };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { success: false, error: resolveAuthErrorKey(updateError, 'auth.errors.updatePasswordFailed') };
  }

  return { success: true };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: authErrorKey('auth.errors.configMissing') };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName?.trim() || undefined,
        username: email.split('@')[0],
      },
    },
  });

  if (error) {
    return { success: false, error: resolveAuthErrorKey(error, 'auth.errors.signUpFailed') };
  }

  if (data.user && fullName?.trim()) {
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('auth_user_id', data.user.id);
  }

  return { success: true };
}

export interface SignOutOptions {
  profileId?: string | null;
  authUserId?: string | null;
}

function isIgnorableSignOutError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('session') ||
    lower.includes('auth session missing') ||
    lower.includes('not logged') ||
    lower.includes('jwt') ||
    lower.includes('expired')
  );
}

/**
 * Release-safe logout:
 * 1) clear private user caches (keeps public place list/map/detail)
 * 2) clear viewer engagement cache
 * 3) sign out of Supabase (local scope fallback if network/session is bad)
 *
 * Callers should also reset in-memory likes/saves (see resetPlaceLikesMemory /
 * resetSavedPlacesMemory) and refresh auth state.
 */
export async function signOut(options?: SignOutOptions): Promise<AuthResult> {
  const profileId = options?.profileId ?? null;
  const authUserId = options?.authUserId ?? null;

  try {
    await clearUserPrivateCache({ profileId, authUserId });
    clearViewerProfileIdCache();
  } catch (error: unknown) {
    devWarn('[Nice Place Auth] local logout cleanup failed');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      if (!isIgnorableSignOutError(error.message)) {
        devWarn('[Nice Place Auth] signOut error:', error.message);
      }
      // Always clear persisted session locally so restart stays guest.
      const local = await supabase.auth.signOut({ scope: 'local' });
      if (local.error && !isIgnorableSignOutError(local.error.message)) {
        return { success: false, error: local.error.message };
      }
    }
    return { success: true };
  } catch (error: unknown) {
    devWarn('[Nice Place Auth] signOut failed');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore — local state already cleared above.
    }
    return { success: true };
  }
}

export async function fetchProfileIdByAuthUserId(
  authUserId: string,
): Promise<{ profileId: string | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { profileId: null, error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    return { profileId: null, error: error.message };
  }

  return { profileId: data.id, error: null };
}

export async function getProfileForUser(user: User | null): Promise<DbProfile | null> {
  if (!user) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return readUserProfileByAuthCache(user.id, { allowExpired: true });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) {
      devWarn('[Nice Place] Failed to load profile:', error.message);
      const cached = await readUserProfileByAuthCache(user.id, { allowExpired: true });
      if (cached) {
        markNetworkFailure();
      }
      return cached;
    }

    const profile = (data as DbProfile) ?? null;
    if (profile) {
      writeUserProfileCache(profile);
      markNetworkSuccess();
    }
    return profile;
  } catch (error: unknown) {
    devWarn('[Nice Place] Profile request failed');
    const cached = await readUserProfileByAuthCache(user.id, { allowExpired: true });
    if (cached) {
      markNetworkFailure();
    }
    return cached;
  }
}

export async function getOrCreateProfileForUser(user: User): Promise<DbProfile | null> {
  const cached = await readUserProfileByAuthCache(user.id, { allowExpired: true });

  const { profileId, error } = await fetchProfileIdByAuthUserId(user.id);
  if (profileId) {
    const profile = await getProfileForUser(user);
    return profile ?? cached;
  }

  if (error && error !== 'JSON object requested, multiple (or no) rows returned') {
    const notFound =
      error.includes('PGRST116') ||
      error.includes('0 rows') ||
      error.includes('multiple (or no) rows returned');
    if (!notFound) {
      devWarn('[Nice Place] Profile lookup failed:', error);
      return cached;
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    return cached;
  }

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const username =
    (typeof metadata?.username === 'string' ? metadata.username.trim() : '') ||
    user.email?.split('@')[0] ||
    `user_${user.id.slice(0, 8)}`;
  const fullName =
    typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : null;

  const { data, error: insertError } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: user.id,
      username,
      full_name: fullName || null,
    })
    .select(PROFILE_SELECT)
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return (await getProfileForUser(user)) ?? cached;
    }
    devWarn('[Nice Place] Failed to create profile:', insertError.message);
    return cached;
  }

  const profile = (data as DbProfile) ?? null;
  if (profile) {
    writeUserProfileCache(profile);
  }
  return profile;
}

export async function resolveCurrentUserProfileId(): Promise<{
  profileId: string | null;
  authUserId: string | null;
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { profileId: null, authUserId: null, error: 'Supabase is not configured.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user;

  let authUserId = sessionUser?.id ?? null;

  if (!authUserId) {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      devWarn('[Nice Place] Auth getUser error:', authError.message);
    }
    authUserId = userData.user?.id ?? null;
  }

  if (!authUserId) {
    return { profileId: null, authUserId: null, error: 'placeForm.errors.signInToShare' };
  }

  // Prefer session from storage; an expired access token is refreshed by the client.
  // Do not treat a missing/stale access_token snapshot as a forced logout.
  if (!sessionData.session?.access_token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      return {
        profileId: null,
        authUserId,
        error: 'auth.errors.sessionExpired',
      };
    }
  }

  const { profileId, error: lookupError } = await fetchProfileIdByAuthUserId(authUserId);

  if (profileId) {
    return { profileId, authUserId };
  }

  const created = await getOrCreateProfileForUser({ id: authUserId } as User);
  if (created?.id) {
    return { profileId: created.id, authUserId };
  }

  return {
    profileId: null,
    authUserId,
    error: lookupError ?? 'placeForm.errors.profileMissing',
  };
}

/** @deprecated Use resolveCurrentUserProfileId for place inserts. */
export async function resolveCurrentUserProfile(): Promise<{
  profile: DbProfile | null;
  error?: string;
}> {
  const { profileId, authUserId, error } = await resolveCurrentUserProfileId();
  if (!profileId || !authUserId) {
    return { profile: null, error };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { profile: null, error: 'Supabase is not configured.' };
  }

  const { data, error: loadError } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('auth_user_id', authUserId)
    .single();

  if (loadError || !data) {
    return {
      profile: { id: profileId, auth_user_id: authUserId } as DbProfile,
      error: undefined,
    };
  }

  return { profile: data as DbProfile };
}
