import { readIsAdminFlag } from '../services/adminAccess';
import { DbProfile } from '../types/database';

/**
 * In-memory profile helper (UI only).
 * Permission must use useAdminAccess() / fetchCurrentUserAdminStatus().
 *
 * Source of truth (matches Supabase RLS): profiles.is_admin === true
 * profiles.role is not used for permission.
 */
export function isAdminProfile(profile: DbProfile | null | undefined): boolean {
  if (!profile) {
    return false;
  }

  return readIsAdminFlag(profile.is_admin);
}
