import { useCallback, useEffect, useState } from 'react';

import { getProfileStats, ProfileStats } from '../services/profileService';
import { devWarn } from '../utils/devLog';

const EMPTY_STATS: ProfileStats = {
  sharedPlacesCount: 0,
  savedPlacesCount: 0,
  likesReceived: 0,
};

interface UseProfileStatsResult {
  stats: ProfileStats;
  loading: boolean;
  refresh: () => Promise<ProfileStats>;
  /** Apply stats derived from already-fetched lists (avoids duplicate count queries). */
  applyStats: (next: ProfileStats) => void;
}

/**
 * Profile stats for a specific profile id (own or another user).
 * Likes = total likes received on that user's places.
 * Does not auto-fetch on mount — parent screens drive loading to avoid duplicate requests.
 */
export function useProfileStats(profileId: string | null | undefined): UseProfileStatsResult {
  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const applyStats = useCallback((next: ProfileStats) => {
    setStats(next);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!profileId) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return EMPTY_STATS;
    }

    setLoading(true);
    try {
      const next = await getProfileStats(profileId);
      setStats(next);
      setLoading(false);
      return next;
    } catch (error: unknown) {
      devWarn('[Nice Place] Profile stats failed:', error);
      setLoading(false);
      return EMPTY_STATS;
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setStats(EMPTY_STATS);
      setLoading(false);
    }
  }, [profileId]);

  return { stats, loading, refresh, applyStats };
}
