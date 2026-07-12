import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { clearUserPrivateCache } from '../cache/clearUserSession';
import { readUserProfileByAuthCache } from '../cache';
import { DbProfile } from '../types/database';
import { getCurrentSession, getOrCreateProfileForUser } from '../services/authService';
import { clearViewerProfileIdCache } from '../services/placeEngagementService';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { devLog, devWarn } from '../utils/devLog';

/** Runtime require avoids a circular import with usePlaceLikes / useSavedPlaces. */
function resetPrivateEngagementMemory(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const likes = require('./usePlaceLikes') as typeof import('./usePlaceLikes');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const saves = require('./useSavedPlaces') as typeof import('./useSavedPlaces');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notifications = require('./useNotifications') as typeof import('./useNotifications');
    likes.resetPlaceLikesMemory();
    saves.resetSavedPlacesMemory();
    notifications.resetNotificationsMemory();
  } catch {
    devWarn('[Nice Place Auth] engagement memory reset failed');
  }
}

interface AuthState {
  session: Session | null;
  profile: DbProfile | null;
  loading: boolean;
}

type AuthListener = (state: AuthState) => void;

const listeners = new Set<AuthListener>();

let authState: AuthState = {
  session: null,
  profile: null,
  loading: true,
};

let initPromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

function notifyAuthListeners(): void {
  listeners.forEach((listener) => listener(authState));
}

function setAuthState(patch: Partial<AuthState>): void {
  authState = { ...authState, ...patch };
  notifyAuthListeners();
}

async function clearLocalUserState(ids?: {
  profileId?: string | null;
  authUserId?: string | null;
}): Promise<void> {
  resetPrivateEngagementMemory();
  clearViewerProfileIdCache();
  if (ids?.profileId || ids?.authUserId) {
    await clearUserPrivateCache({
      profileId: ids.profileId,
      authUserId: ids.authUserId,
    });
  }
  setAuthState({ profile: null });
}

/**
 * Load profile for a signed-in user.
 * Temporary network/profile failures must NOT clear an existing profile or session.
 */
async function loadProfile(user: User | null): Promise<void> {
  if (!user) {
    setAuthState({ profile: null });
    return;
  }

  try {
    const nextProfile = await getOrCreateProfileForUser(user);
    clearViewerProfileIdCache();

    if (nextProfile) {
      setAuthState({ profile: nextProfile });
      return;
    }

    // Keep current profile if we already have one for this user.
    if (authState.profile?.auth_user_id === user.id) {
      if (__DEV__) {
        devWarn('[Nice Place Auth] profile fetch returned empty — keeping cached profile');
      }
      return;
    }

    const cached = await readUserProfileByAuthCache(user.id, { allowExpired: true });
    if (cached) {
      setAuthState({ profile: cached });
      return;
    }

    if (__DEV__) {
      devWarn('[Nice Place Auth] profile unavailable after session restore');
    }
  } catch (error: unknown) {
    if (__DEV__) {
      devWarn('[Nice Place Auth] profile load failed — keeping session', error);
    }

    if (authState.profile?.auth_user_id === user.id) {
      return;
    }

    const cached = await readUserProfileByAuthCache(user.id, { allowExpired: true });
    if (cached) {
      setAuthState({ profile: cached });
    }
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  const supabase = getSupabase();
  if (!supabase) {
    return;
  }

  if (nextState === 'active') {
    if (__DEV__) {
      devLog('[Nice Place Auth] app active — startAutoRefresh');
    }
    void supabase.auth.startAutoRefresh();
  } else {
    if (__DEV__) {
      devLog('[Nice Place Auth] app background — stopAutoRefresh');
    }
    void supabase.auth.stopAutoRefresh();
  }
}

async function handleAuthEvent(
  event: AuthChangeEvent,
  nextSession: Session | null,
): Promise<void> {
  if (__DEV__) {
    devLog('[Nice Place Auth] auth event', {
      event,
      hasSession: Boolean(nextSession),
      userId: nextSession?.user?.id ? `${nextSession.user.id.slice(0, 8)}…` : null,
    });
  }

  // Only a genuine SIGNED_OUT clears authenticated local state.
  // Do not treat TOKEN_REFRESHED / USER_UPDATED / transient nulls as logout.
  if (event === 'SIGNED_OUT') {
    if (__DEV__) {
      devLog('[Nice Place Auth] real sign-out event');
    }
    await clearLocalUserState({
      profileId: authState.profile?.id ?? null,
      authUserId: authState.session?.user?.id ?? null,
    });
    setAuthState({ session: null, profile: null, loading: false });
    return;
  }

  if (
    event === 'TOKEN_REFRESHED' ||
    event === 'USER_UPDATED' ||
    event === 'SIGNED_IN' ||
    event === 'INITIAL_SESSION' ||
    event === 'PASSWORD_RECOVERY'
  ) {
    if (event === 'TOKEN_REFRESHED' && __DEV__) {
      devLog('[Nice Place Auth] token refreshed');
    }

    setAuthState({ session: nextSession });

    if (nextSession?.user) {
      await loadProfile(nextSession.user);
    } else if (event === 'INITIAL_SESSION') {
      // Guest launch — no session in storage.
      resetPrivateEngagementMemory();
      setAuthState({ profile: null });
    }

    setAuthState({ loading: false });
    return;
  }

  // Unknown / future events: update session if present, never force logout.
  if (nextSession) {
    setAuthState({ session: nextSession, loading: false });
    if (nextSession.user) {
      await loadProfile(nextSession.user);
    }
  }
}

async function initializeAuthStore(): Promise<void> {
  if (!isSupabaseConfigured()) {
    setAuthState({ session: null, profile: null, loading: false });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    setAuthState({ session: null, profile: null, loading: false });
    return;
  }

  try {
    // Restore persisted session from AsyncStorage. Do NOT call getUser() + signOut
    // here — an expired access token is normal after backgrounding; autoRefresh
    // + refresh token must remain intact.
    const nextSession = await getCurrentSession();

    if (__DEV__) {
      devLog('[Nice Place Auth] initial session restoration', {
        hasSession: Boolean(nextSession),
        userId: nextSession?.user?.id ? `${nextSession.user.id.slice(0, 8)}…` : null,
      });
    }

    setAuthState({ session: nextSession });

    if (nextSession?.user) {
      await loadProfile(nextSession.user);
    } else {
      resetPrivateEngagementMemory();
      setAuthState({ profile: null });
    }
  } catch (error: unknown) {
    if (__DEV__) {
      devWarn('[Nice Place Auth] session restoration failed — staying guest', error);
    }
    setAuthState({ session: null, profile: null });
  } finally {
    setAuthState({ loading: false });
  }

  if (!authSubscription) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      void handleAuthEvent(event, session);
    });
    authSubscription = data.subscription;
  }

  if (!appStateSubscription) {
    // React Native: pause refresh timers in background, resume when active.
    void supabase.auth.startAutoRefresh();
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  }
}

function ensureAuthStore(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeAuthStore();
  }
  return initPromise;
}

interface UseAuthResult {
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  loading: boolean;
  isConfigured: boolean;
  refresh: () => Promise<void>;
}

/**
 * Shared auth hook — single session restore + single onAuthStateChange listener
 * for the whole app (module singleton), regardless of how many components call it.
 */
export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>(authState);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    const listener: AuthListener = (next) => {
      setState(next);
    };

    listeners.add(listener);
    setState(authState);
    void ensureAuthStore();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    await ensureAuthStore();
    const previousProfileId = authState.profile?.id ?? null;
    const previousAuthUserId = authState.session?.user?.id ?? null;
    const nextSession = await getCurrentSession();
    setAuthState({ session: nextSession });

    if (nextSession?.user) {
      await loadProfile(nextSession.user);
    } else {
      await clearLocalUserState({
        profileId: previousProfileId,
        authUserId: previousAuthUserId,
      });
    }
  }, []);

  return {
    session: state.session,
    user: state.session?.user ?? null,
    profile: state.profile,
    loading: state.loading,
    isConfigured,
    refresh,
  };
}
