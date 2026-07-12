import { useCallback, useEffect, useState } from 'react';
import { localizeCollectionMessage } from '../utils/collectionMessages';
import { devWarn } from '../utils/devLog';
import { toUserFacingNetworkError } from '../utils/networkErrors';

import { readSavedIdsCache, writeSavedIdsCache } from '../cache';
import { hapticError, hapticLight, showAppToast } from '../feedback';
import { i18n } from '../i18n/instance';
import {
  getSavedPlaceIds,
  SavedPlaceResult,
  toggleSavedPlace,
} from '../services/savedPlacesService';
import { isSupabaseConfigured } from '../services/supabase';

import { useAuth } from './useAuth';

type SavedPlacesListener = (state: {
  savedIds: string[];
  saveCounts: Record<string, number>;
}) => void;

let cachedSavedIds: string[] | null = null;
let cachedProfileId: string | null = null;
let cachedSaveCounts: Record<string, number> = {};
const pendingPlaceIds = new Set<string>();
const listeners = new Set<SavedPlacesListener>();

function notifyListeners(savedIds: string[], saveCounts: Record<string, number>) {
  cachedSavedIds = savedIds;
  cachedSaveCounts = saveCounts;
  listeners.forEach((listener) => listener({ savedIds, saveCounts }));
}

/** Clear in-memory saves after logout so the next guest session cannot see prior user state. */
export function resetSavedPlacesMemory(): void {
  cachedProfileId = null;
  cachedSavedIds = [];
  cachedSaveCounts = {};
  pendingPlaceIds.clear();
  notifyListeners([], {});
}

function clampCount(value: number): number {
  return Math.max(0, value);
}

interface UseSavedPlacesResult {
  savedIds: string[];
  ready: boolean;
  isSaved: (placeId: string) => boolean;
  getSaveCount: (placeId: string, fallback?: number) => number;
  isToggling: (placeId: string) => boolean;
  toggleSave: (placeId: string, currentCount?: number) => Promise<SavedPlaceResult>;
  refresh: () => Promise<string[]>;
  /** Sync ids from an already-fetched saved places list (no extra network). */
  syncIds: (ids: string[]) => void;
}

export function useSavedPlaces(): UseSavedPlacesResult {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [savedIds, setSavedIds] = useState<string[]>(cachedSavedIds ?? []);
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>(cachedSaveCounts);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [ready, setReady] = useState(!isSupabaseConfigured() || cachedSavedIds != null);

  const syncIds = useCallback(
    (ids: string[]) => {
      if (!profileId) {
        return;
      }
      cachedProfileId = profileId;
      writeSavedIdsCache(profileId, ids);
      notifyListeners(ids, cachedSaveCounts);
      setSavedIds(ids);
      setReady(true);
    },
    [profileId],
  );

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !profileId) {
      cachedProfileId = null;
      cachedSavedIds = [];
      notifyListeners([], cachedSaveCounts);
      setSavedIds([]);
      setReady(true);
      return [];
    }

    try {
      const ids = await getSavedPlaceIds(profileId);
      cachedProfileId = profileId;
      writeSavedIdsCache(profileId, ids);
      notifyListeners(ids, cachedSaveCounts);
      setSavedIds(ids);
      setReady(true);
      return ids;
    } catch (error: unknown) {
      devWarn('[Nice Place Saves] refresh failed:', error);
      setReady(true);
      return cachedSavedIds ?? [];
    }
  }, [profileId]);

  useEffect(() => {
    const listener: SavedPlacesListener = ({ savedIds: nextIds, saveCounts: nextCounts }) => {
      setSavedIds(nextIds);
      setSaveCounts(nextCounts);
      setReady(true);
    };

    listeners.add(listener);

    if (!isSupabaseConfigured()) {
      setSavedIds([]);
      setReady(true);
    } else if (profileId !== cachedProfileId) {
      void (async () => {
        if (profileId && cachedSavedIds == null) {
          const disk = await readSavedIdsCache(profileId, { allowExpired: true });
          if (disk) {
            cachedProfileId = profileId;
            notifyListeners(disk, cachedSaveCounts);
            setSavedIds(disk);
            setReady(true);
          }
        }
        await refresh();
      })();
    } else if (cachedSavedIds != null) {
      setSavedIds(cachedSavedIds);
      setSaveCounts(cachedSaveCounts);
      setReady(true);
    } else {
      void refresh();
    }

    return () => {
      listeners.delete(listener);
    };
  }, [profileId, refresh]);

  const isSaved = useCallback(
    (placeId: string) => savedIds.includes(placeId),
    [savedIds],
  );

  const getSaveCount = useCallback(
    (placeId: string, fallback = 0) => {
      if (Object.prototype.hasOwnProperty.call(saveCounts, placeId)) {
        return clampCount(saveCounts[placeId]);
      }
      return clampCount(fallback);
    },
    [saveCounts],
  );

  const isToggling = useCallback(
    (placeId: string) => pendingIds.includes(placeId) || pendingPlaceIds.has(placeId),
    [pendingIds],
  );

  const toggleSave = useCallback(
    async (placeId: string, currentCount = 0): Promise<SavedPlaceResult> => {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'auth.errors.configMissing' };
      }

      if (!profileId) {
        return {
          success: false,
          requiresAuth: true,
          error: 'explore.auth.saveShort',
        };
      }

      if (pendingPlaceIds.has(placeId)) {
        return { success: false, error: 'common.pleaseWait' };
      }

      const baseIds = cachedSavedIds ?? savedIds;
      const previousCounts = { ...cachedSaveCounts };
      const currentlySaved = baseIds.includes(placeId);
      const previousCount = Object.prototype.hasOwnProperty.call(previousCounts, placeId)
        ? previousCounts[placeId]
        : currentCount;
      const optimisticCount = clampCount(
        currentlySaved ? previousCount - 1 : previousCount + 1,
      );
      const optimisticIds = currentlySaved
        ? baseIds.filter((id) => id !== placeId)
        : [...baseIds, placeId];
      const optimisticCounts = { ...previousCounts, [placeId]: optimisticCount };

      pendingPlaceIds.add(placeId);
      setPendingIds(Array.from(pendingPlaceIds));
      notifyListeners(optimisticIds, optimisticCounts);
      setSavedIds(optimisticIds);
      setSaveCounts(optimisticCounts);

      const result = await toggleSavedPlace(
        profileId,
        placeId,
        currentlySaved,
        previousCount,
      );

      pendingPlaceIds.delete(placeId);
      setPendingIds(Array.from(pendingPlaceIds));

      if (!result.success) {
        const rolledBackCounts = { ...previousCounts, [placeId]: previousCount };
        notifyListeners(baseIds, rolledBackCounts);
        setSavedIds(baseIds);
        setSaveCounts(rolledBackCounts);
        devWarn('[Nice Place Saves] error', result.error);
        hapticError();
        if (result.error && !result.requiresAuth) {
          const localized = localizeCollectionMessage(result.error);
          showAppToast(
            localized && localized !== result.error
              ? localized
              : toUserFacingNetworkError(result.error),
            { tone: 'error' },
          );
        }
        return result;
      }

      const confirmedCount = clampCount(result.saveCount ?? optimisticCount);
      const confirmedCounts = { ...previousCounts, [placeId]: confirmedCount };
      notifyListeners(optimisticIds, confirmedCounts);
      setSavedIds(optimisticIds);
      setSaveCounts(confirmedCounts);
      writeSavedIdsCache(profileId, optimisticIds);

      hapticLight();
      showAppToast(currentlySaved ? i18n.t('place.toasts.removed') : i18n.t('place.toasts.saved'), {
        tone: 'success',
        icon: currentlySaved ? 'bookmark-outline' : 'bookmark',
        durationMs: 1600,
      });

      return { ...result, saveCount: confirmedCount };
    },
    [profileId, savedIds],
  );

  return {
    savedIds,
    ready,
    isSaved,
    getSaveCount,
    isToggling,
    toggleSave,
    refresh,
    syncIds,
  };
}
