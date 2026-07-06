import { readUserProfileByAuthCache, writeUserProfileCache } from '../cache';
import { DbProfile } from '../types/database';
import { devLog, devWarn } from '../utils/devLog';

import { getSupabase } from './supabase';

export interface AdminAccessStatus {
  /** Permission decision — true only when profiles.is_admin is true. */
  isAdmin: boolean;
  /**
   * True when Supabase returned a profile row (or definitive non-admin).
   * False when we could not verify (network/config) — callers may fall back to in-memory is_admin only.
   */
  verified: boolean;
  authUserId: string | null;
  profileId: string | null;
  /** Raw profiles.is_admin from Supabase. */
  isAdminRaw: unknown;
  /** Raw profiles.role (UI/debug only — never used for write permission). */
  roleRaw: unknown;
  /** True when role looks like admin but is_admin is false (RLS will block writes). */
  roleOnlyAdmin: boolean;
  detectedField: 'is_admin' | 'none';
  profileRow: Record<string, unknown> | null;
  error?: string;
}

/**
 * Coerce profiles.is_admin only (boolean / common string forms).
 * Does not treat role strings as admin.
 */
export function readIsAdminFlag(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (value === false || value == null) {
    return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 't' || normalized === '1';
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
}

function isRoleAdminValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'admin';
}

function resolveAdminFromRow(row: Record<string, unknown> | null): {
  isAdmin: boolean;
  detectedField: AdminAccessStatus['detectedField'];
  isAdminRaw: unknown;
  roleRaw: unknown;
  roleOnlyAdmin: boolean;
} {
  if (!row) {
    return {
      isAdmin: false,
      detectedField: 'none',
      isAdminRaw: null,
      roleRaw: null,
      roleOnlyAdmin: false,
    };
  }

  const isAdminRaw = row.is_admin;
  const roleRaw = row.role ?? null;
  const isAdmin = readIsAdminFlag(isAdminRaw);
  const roleOnlyAdmin = !isAdmin && isRoleAdminValue(roleRaw);

  return {
    isAdmin,
    detectedField: isAdmin ? 'is_admin' : 'none',
    isAdminRaw,
    roleRaw,
    roleOnlyAdmin,
  };
}

/**
 * Live admin check — always queries Supabase profiles for the current session user.
 * Permission source of truth: profiles.is_admin === true (matches RLS).
 * profiles.role is logged only; it is not used for permission.
 */
export async function fetchCurrentUserAdminStatus(): Promise<AdminAccessStatus> {
  const empty: AdminAccessStatus = {
    isAdmin: false,
    verified: false,
    authUserId: null,
    profileId: null,
    isAdminRaw: null,
    roleRaw: null,
    roleOnlyAdmin: false,
    detectedField: 'none',
    profileRow: null,
  };

  const supabase = getSupabase();
  if (!supabase) {
    return { ...empty, error: 'Supabase is not configured.' };
  }

  try {
    let authUserId: string | null = null;
    const userResult = await supabase.auth.getUser();
    if (userResult.data.user?.id) {
      authUserId = userResult.data.user.id;
    } else {
      authUserId = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
    }

    if (!authUserId) {
      devLog('[Nice Place Admin] access check: no authenticated user');
      return { ...empty, verified: true };
    }

    // Prefer is_admin only; include role for debug when present.
    let row: Record<string, unknown> | null = null;
    let lookupError: string | undefined;

    const primary = await supabase
      .from('profiles')
      .select('id, auth_user_id, is_admin, role')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (primary.error) {
      const message = primary.error.message.toLowerCase();
      const missingRoleColumn =
        message.includes('role') &&
        (message.includes('column') || message.includes('does not exist'));

      if (missingRoleColumn) {
        const fallback = await supabase
          .from('profiles')
          .select('id, auth_user_id, is_admin')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (fallback.error) {
          lookupError = fallback.error.message;
        } else {
          row = (fallback.data as Record<string, unknown> | null) ?? null;
        }
      } else {
        lookupError = primary.error.message;
      }
    } else {
      row = (primary.data as Record<string, unknown> | null) ?? null;
    }

    if (lookupError) {
      devWarn('[Nice Place Admin] profile admin lookup failed:', lookupError);
      return {
        ...empty,
        authUserId,
        verified: false,
        error: lookupError,
      };
    }

    const profileId = typeof row?.id === 'string' ? row.id : null;
    const resolved = resolveAdminFromRow(row);

    if (resolved.roleOnlyAdmin) {
      devWarn(
        '[Nice Place Admin] profiles.role is "admin" but profiles.is_admin is not true.',
        'Supabase RLS requires is_admin = true for approve/reject writes.',
        'Run scripts/2026_07_04_admin_panel_rls.sql or: update public.profiles set is_admin = true where auth_user_id = …',
      );
    }

    if (profileId) {
      const cached = await readUserProfileByAuthCache(authUserId, { allowExpired: true });
      if (cached) {
        writeUserProfileCache({
          ...cached,
          is_admin: resolved.isAdmin,
        } as DbProfile);
      }
    }

    devLog('[Nice Place Admin] access check', {
      authUserId,
      profileId,
      profileRow: row,
      isAdminRaw: resolved.isAdminRaw,
      roleRaw: resolved.roleRaw,
      roleOnlyAdmin: resolved.roleOnlyAdmin,
      detectedField: resolved.detectedField,
      isAdmin: resolved.isAdmin,
      note: 'Permission uses is_admin only; RLS requires is_admin = true',
    });

    return {
      isAdmin: resolved.isAdmin,
      verified: true,
      authUserId,
      profileId,
      isAdminRaw: resolved.isAdminRaw,
      roleRaw: resolved.roleRaw,
      roleOnlyAdmin: resolved.roleOnlyAdmin,
      detectedField: resolved.detectedField,
      profileRow: row,
    };
  } catch (error: unknown) {
    devWarn('[Nice Place Admin] access check exception:', error);
    return { ...empty, verified: false, error: 'Could not verify admin access.' };
  }
}

export async function assertAdminAccess(): Promise<
  { ok: true; authUserId: string } | { ok: false; error: string }
> {
  const status = await fetchCurrentUserAdminStatus();

  devLog('[Nice Place Admin] assertAdminAccess', {
    authUserId: status.authUserId,
    profileId: status.profileId,
    isAdminRaw: status.isAdminRaw,
    roleRaw: status.roleRaw,
    roleOnlyAdmin: status.roleOnlyAdmin,
    detectedField: status.detectedField,
    isAdmin: status.isAdmin,
    verified: status.verified,
    error: status.error ?? null,
    note: 'Write actions require profiles.is_admin = true (RLS)',
  });

  if (!status.authUserId) {
    return { ok: false, error: 'Sign in as an admin to continue.' };
  }

  if (!status.verified) {
    return {
      ok: false,
      error: status.error ?? 'Could not verify admin access. Check your connection and try again.',
    };
  }

  if (!status.isAdmin) {
    return { ok: false, error: 'You do not have admin access.' };
  }

  return { ok: true, authUserId: status.authUserId };
}
