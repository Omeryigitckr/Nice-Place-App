import { i18n } from '../i18n/instance';
import { useCallback, useEffect, useState } from 'react';
import { devLog, devWarn } from '../utils/devLog';
import { toUserFacingNetworkError } from '../utils/networkErrors';

import { readLikedIdsCache, writeLikedIdsCache } from '../cache';
import { hapticError, hapticLight, showAppToast } from '../feedback';
import {
  getLikedPlaceIds,
  LikeResult,
  togglePlaceLike,
} from '../services/likesService';
import { isSupabaseConfigured } from '../services/supabase';

import { useAuth } from './useAuth';

type LikesListener = (state: {
  likedIds: string[];
  likeCounts: Record<string, number>;
}) => void;

let cachedLikedIds: string[] | null = null;
let cachedProfileId: string | null = null;
let cachedLikeCounts: Record<string, number> = {};
const pendingPlaceIds = new Set<string>();
const listeners = new Set<LikesListener>();

function notifyListeners(likedIds: string[], likeCounts: Record<string, number>) {
  cachedLikedIds = likedIds;
  cachedLikeCounts = likeCounts;
  listeners.forEach((listener) => listener({ likedIds, likeCounts }));
}

/** Clear in-memory likes after logout so the next guest session cannot see prior user state. */
export function resetPlaceLikesMemory(): void {
  cachedProfileId = null;
  cachedLikedIds = [];
  cachedLikeCounts = {};
  pendingPlaceIds.clear();
  notifyListeners([], {});
}

function clampCount(value: number): number {
  return Math.max(0, value);
}

/**
 * Prefer the shared optimistic/confirmed count so Explore, Detail, and lists stay in sync.
 * Falls back to the place payload only when this place has never been toggled this session.
 */
function resolveDisplayedCount(
  placeId: string,
  likeCounts: Record<string, number>,
  fallback: number,
): number {
  if (Object.prototype.hasOwnProperty.call(likeCounts, placeId)) {
    return clampCount(likeCounts[placeId]);
  }
  return clampCount(fallback);
}

interface UsePlaceLikesResult {
  likedIds: string[];
  ready: boolean;
  isLiked: (placeId: string) => boolean;
  getLikeCount: (placeId: string, fallback?: number) => number;
  isToggling: (placeId: string) => boolean;
  toggleLike: (placeId: string, currentCount?: number) => Promise<LikeResult>;
  refresh: () => Promise<string[]>;
}

export function usePlaceLikes(): UsePlaceLikesResult {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [likedIds, setLikedIds] = useState<string[]>(cachedLikedIds ?? []);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(cachedLikeCounts);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [ready, setReady] = useState(!isSupabaseConfigured() || cachedLikedIds != null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !profileId) {
      cachedProfileId = null;
      cachedLikedIds = [];
      // Keep likeCounts so public counts do not flash to 0 for guests / signed-out.
      notifyListeners([], cachedLikeCounts);
      setLikedIds([]);
      setReady(true);
      return [];
    }

    try {
      const ids = await getLikedPlaceIds(profileId);
      cachedProfileId = profileId;
      writeLikedIdsCache(profileId, ids);
      // Preserve known counts — refreshing liked ids must not zero displayed counts.
      notifyListeners(ids, cachedLikeCounts);
      setLikedIds(ids);
      setReady(true);
      return ids;
    } catch (error: unknown) {
      devWarn('[Nice Place Likes] refresh failed:', error);
      setReady(true);
      return cachedLikedIds ?? [];
    }
  }, [profileId]);

  useEffect(() => {
    const listener: LikesListener = ({ likedIds: nextIds, likeCounts: nextCounts }) => {
      setLikedIds(nextIds);
      setLikeCounts(nextCounts);
      setReady(true);
    };

    listeners.add(listener);

    if (!isSupabaseConfigured()) {
      setLikedIds([]);
      setReady(true);
    } else if (profileId !== cachedProfileId) {
      void (async () => {
        if (profileId && cachedLikedIds == null) {
          const disk = await readLikedIdsCache(profileId, { allowExpired: true });
          if (disk) {
            cachedProfileId = profileId;
            notifyListeners(disk, cachedLikeCounts);
            setLikedIds(disk);
            setReady(true);
          }
        }
        await refresh();
      })();
    } else if (cachedLikedIds != null) {
      setLikedIds(cachedLikedIds);
      setLikeCounts(cachedLikeCounts);
      setReady(true);
    } else {
      void refresh();
    }

    return () => {
      listeners.delete(listener);
    };
  }, [profileId, refresh]);

  const isLiked = useCallback(
    (placeId: string) => likedIds.includes(placeId),
    [likedIds],
  );

  const getLikeCount = useCallback(
    (placeId: string, fallback = 0) => resolveDisplayedCount(placeId, likeCounts, fallback),
    [likeCounts],
  );

  const isToggling = useCallback(
    (placeId: string) => pendingIds.includes(placeId) || pendingPlaceIds.has(placeId),
    [pendingIds],
  );

  const toggleLike = useCallback(
    async (placeId: string, currentCount = 0): Promise<LikeResult> => {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'auth.errors.configMissing' };
      }

      if (!profileId) {
        return {
          success: false,
          requiresAuth: true,
          error: i18n.t('explore.auth.like'),
        };
      }

      if (pendingPlaceIds.has(placeId)) {
        return { success: false, error: i18n.t('common.pleaseWait') };
      }

      const baseIds = cachedLikedIds ?? likedIds;
      const previousCounts = { ...cachedLikeCounts };
      const currentlyLiked = baseIds.includes(placeId);
      // Never invent 0 when we already know a better count from shared state or the card.
      const previousCount = resolveDisplayedCount(placeId, previousCounts, currentCount);
      const optimisticCount = clampCount(
        currentlyLiked ? previousCount - 1 : previousCount + 1,
      );
      const optimisticIds = currentlyLiked
        ? baseIds.filter((id) => id !== placeId)
        : [...baseIds, placeId];
      const optimisticCounts = { ...previousCounts, [placeId]: optimisticCount };

      pendingPlaceIds.add(placeId);
      setPendingIds(Array.from(pendingPlaceIds));
      // Optimistic UI first — all subscribed screens update before the network returns.
      notifyListeners(optimisticIds, optimisticCounts);
      setLikedIds(optimisticIds);
      setLikeCounts(optimisticCounts);
      hapticLight();

      try {
        const result = await togglePlaceLike(
          profileId,
          placeId,
          currentlyLiked,
          previousCount,
        );

        if (!result.success) {
          const rolledBackCounts = { ...previousCounts, [placeId]: previousCount };
          notifyListeners(baseIds, rolledBackCounts);
          setLikedIds(baseIds);
          setLikeCounts(rolledBackCounts);
          devWarn('[Nice Place Likes] error', result.error);
          hapticError();
          if (result.error && !result.requiresAuth) {
            showAppToast(toUserFacingNetworkError(result.error), { tone: 'error' });
          }
          return result;
        }

        // Prefer server count when present; otherwise keep the optimistic value (never 0 flash).
        const confirmedCount = clampCount(
          typeof result.likeCount === 'number' ? result.likeCount : optimisticCount,
        );
        const confirmedCounts = { ...cachedLikeCounts, [placeId]: confirmedCount };
        notifyListeners(optimisticIds, confirmedCounts);
        setLikedIds(optimisticIds);
        setLikeCounts(confirmedCounts);
        writeLikedIdsCache(profileId, optimisticIds);

        if (__DEV__) {
          devLog(
            '[likes] liked/unliked result',
            currentlyLiked ? 'unliked' : 'liked',
            placeId,
            confirmedCount,
          );
        }

        return { ...result, likeCount: confirmedCount };
      } catch (error: unknown) {
        const rolledBackCounts = { ...previousCounts, [placeId]: previousCount };
        notifyListeners(baseIds, rolledBackCounts);
        setLikedIds(baseIds);
        setLikeCounts(rolledBackCounts);
        devWarn('[Nice Place Likes] toggle threw:', error);
        hapticError();
        showAppToast(toUserFacingNetworkError(i18n.t('errors.generic')), {
          tone: 'error',
        });
        return { success: false, error: i18n.t('errors.generic') };
      } finally {
        pendingPlaceIds.delete(placeId);
        setPendingIds(Array.from(pendingPlaceIds));
      }
    },
    [profileId, likedIds],
  );

  return {
    likedIds,
    ready,
    isLiked,
    getLikeCount,
    isToggling,
    toggleLike,
    refresh,
  };
}
