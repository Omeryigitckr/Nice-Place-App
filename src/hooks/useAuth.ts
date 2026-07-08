import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clearUserPrivateCache } from '../cache/clearUserSession';
import { readUserProfileByAuthCache } from '../cache';
import { DbProfile } from '../types/database';
import { getCurrentSession, getOrCreateProfileForUser } from '../services/authService';
import { clearViewerProfileIdCache } from '../services/placeEngagementService';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { devWarn } from '../utils/devLog';

/** Runtime require avoids a circular import with usePlaceLikes / useSavedPlaces. */
function resetPrivateEngagementMemory(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const likes = require('./usePlaceLikes') as typeof import('./usePlaceLikes');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const saves = require('./useSavedPlaces') as typeof import('./useSavedPlaces');
    likes.resetPlaceLikesMemory();
    saves.resetSavedPlacesMemory();
  } catch {
    devWarn('[Nice Place Auth] engagement memory reset failed');
  }
}

interface UseAuthResult {
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  loading: boolean;
  isConfigured: boolean;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();
  const profileRef = useRef<DbProfile | null>(null);
  const authUserIdRef = useRef<string | null>(null);
  profileRef.current = profile;
  authUserIdRef.current = session?.user?.id ?? null;

  const clearLocalUserState = useCallback(async (ids?: {
    profileId?: string | null;
    authUserId?: string | null;
  }) => {
    resetPrivateEngagementMemory();
    clearViewerProfileIdCache();
    if (ids?.profileId || ids?.authUserId) {
      await clearUserPrivateCache({
        profileId: ids.profileId,
        authUserId: ids.authUserId,
      });
    }
    setProfile(null);
  }, []);

  const loadProfile = useCallback(async (user: User | null) => {
    if (!user) {
      await clearLocalUserState();
      return;
    }

    try {
      const nextProfile = await getOrCreateProfileForUser(user);
      clearViewerProfileIdCache();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    }
  }, [clearLocalUserState]);

  const refresh = useCallback(async () => {
    const nextSession = await getCurrentSession();
    setSession(nextSession);
    await loadProfile(nextSession?.user ?? null);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isConfigured) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      let nextSession = await getCurrentSession();

      // Gracefully drop expired/invalid sessions without blocking on network blips.
      if (nextSession) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data.user) {
              const message = (error?.message ?? '').toLowerCase();
              const invalid =
                error?.status === 401 ||
                message.includes('jwt') ||
                message.includes('expired') ||
                message.includes('invalid') ||
                message.includes('session');
              if (invalid) {
                devWarn('[Nice Place Auth] invalid session, switching to guest');
                const cachedProfile = await readUserProfileByAuthCache(
                  nextSession.user.id,
                  { allowExpired: true },
                );
                await clearLocalUserState({
                  profileId: cachedProfile?.id ?? null,
                  authUserId: nextSession.user.id,
                });
                await supabase.auth.signOut({ scope: 'local' });
                nextSession = null;
              }
            }
          } catch {
            // Network failure — keep cached session and continue.
          }
        }
      }

      if (!mounted) {
        return;
      }

      setSession(nextSession);
      if (!nextSession) {
        resetPrivateEngagementMemory();
      }
      await loadProfile(nextSession?.user ?? null);
      if (mounted) {
        setLoading(false);
      }
    };

    void init();

    const supabase = getSupabase();
    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, nextSession: Session | null) => {
        if (!mounted) {
          return;
        }

        if (event === 'SIGNED_OUT' || !nextSession) {
          await clearLocalUserState({
            profileId: profileRef.current?.id ?? null,
            authUserId: authUserIdRef.current,
          });
        }

        setSession(nextSession);
        await loadProfile(nextSession?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [clearLocalUserState, isConfigured, loadProfile]);

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isConfigured,
    refresh,
  };
}
