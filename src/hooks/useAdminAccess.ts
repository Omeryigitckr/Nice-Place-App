import { useCallback, useEffect, useState } from 'react';

import {
  AdminAccessStatus,
  fetchCurrentUserAdminStatus,
  readIsAdminFlag,
} from '../services/adminAccess';
import { DbProfile } from '../types/database';
import { devLog } from '../utils/devLog';

import { useAuth } from './useAuth';

export interface UseAdminAccessResult {
  /**
   * True only when permission is granted via profiles.is_admin === true.
   * Never true while loading. Never true from role alone.
   */
  isAdmin: boolean;
  /**
   * Profile entry visibility.
   * While loading, optimistically uses in-memory profile.is_admin only (not role).
   */
  showAdminEntry: boolean;
  /** True while auth or live admin check is in progress. */
  loading: boolean;
  error?: string;
  user: ReturnType<typeof useAuth>['user'];
  profile: DbProfile | null;
  authUserId: string | null;
  profileId: string | null;
  isAdminRaw: unknown;
  roleOnlyAdmin: boolean;
  detectedField: AdminAccessStatus['detectedField'] | null;
  refresh: () => Promise<void>;
}

/**
 * Shared admin access for Profile entry + admin screens.
 * Permission source of truth: live profiles.is_admin (matches Supabase RLS).
 */
export function useAdminAccess(): UseAdminAccessResult {
  const { user, profile, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [live, setLive] = useState<AdminAccessStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      setLive({
        isAdmin: false,
        verified: true,
        authUserId: null,
        profileId: null,
        isAdminRaw: null,
        roleRaw: null,
        roleOnlyAdmin: false,
        detectedField: 'none',
        profileRow: null,
      });
      setChecking(false);
      devLog('[Nice Place Admin] useAdminAccess', {
        where: 'hook',
        authUserId: null,
        isAdmin: false,
        reason: 'guest',
      });
      return;
    }

    setChecking(true);
    try {
      const next = await fetchCurrentUserAdminStatus();
      setLive(next);
      devLog('[Nice Place Admin] useAdminAccess', {
        where: 'hook',
        authUserId: next.authUserId,
        profileId: next.profileId,
        isAdminRaw: next.isAdminRaw,
        roleRaw: next.roleRaw,
        roleOnlyAdmin: next.roleOnlyAdmin,
        detectedField: next.detectedField,
        isAdmin: next.isAdmin,
        verified: next.verified,
        note: 'Permission uses is_admin only; RLS requires is_admin = true',
      });
    } finally {
      setChecking(false);
    }
  }, [authLoading, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // In-memory fallback uses is_admin only (never role).
  const profileIsAdmin = Boolean(userId) && readIsAdminFlag(profile?.is_admin);
  const loading = authLoading || (Boolean(userId) && live === null) || checking;

  let isAdmin = false;
  if (!loading) {
    if (live?.verified) {
      isAdmin = live.isAdmin;
    } else {
      // Network/config failure only: fall back to in-memory is_admin.
      isAdmin = profileIsAdmin;
    }
  }

  const showAdminEntry = Boolean(userId) && (loading ? profileIsAdmin : isAdmin);

  return {
    isAdmin,
    showAdminEntry,
    loading,
    error: live?.error,
    user,
    profile,
    authUserId: live?.authUserId ?? userId,
    profileId: live?.profileId ?? profile?.id ?? null,
    isAdminRaw: live?.isAdminRaw ?? profile?.is_admin ?? null,
    roleOnlyAdmin: live?.roleOnlyAdmin ?? false,
    detectedField: live?.detectedField ?? null,
    refresh,
  };
}
