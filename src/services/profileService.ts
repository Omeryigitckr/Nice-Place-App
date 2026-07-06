import { Place } from '../types/place';
import { PublicProfileStats, PublicProfileSummary } from '../types/publicProfile';
import { devLog, devWarn } from '../utils/devLog';

import { getLikesReceivedForProfile } from './likesService';
import { getSavedPlaces } from './savedPlacesService';
import { getSupabase } from './supabase';

/** Real profiles schema — no display_name / full_name on public reads. */
const PUBLIC_PROFILE_SELECT = 'id, auth_user_id, username, avatar_url, bio';

interface DbPublicProfileRow {
  id: string;
  auth_user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

function mapPublicProfileRow(row: DbPublicProfileRow): PublicProfileSummary {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
  };
}

export interface ProfileStats {
  sharedPlacesCount: number;
  savedPlacesCount: number;
  likesReceived: number;
}

export interface UpdateProfileInput {
  fullName: string;
  username: string;
  bio: string;
}

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export async function updateProfile(
  profileId: string,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      username: input.username,
      bio: input.bio.trim() || null,
    })
    .eq('id', profileId);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'That username is already taken.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getProfileStats(profileId: string): Promise<ProfileStats> {
  const empty = { sharedPlacesCount: 0, savedPlacesCount: 0, likesReceived: 0 };
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return empty;
  }

  try {
    const createdByKeys = await getProfileCreatedByKeys(profileId);

    const [sharedResult, savedResult, likesReceived] = await Promise.all([
      supabase
        .from('places')
        .select('id', { count: 'exact', head: true })
        .in('created_by', createdByKeys)
        .eq('status', 'approved'),
      supabase
        .from('saved_places')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId),
      getLikesReceivedForProfile(profileId),
    ]);

    if (sharedResult.error) {
      devWarn('[Nice Place] Failed to count shared places:', sharedResult.error.message);
    }

    if (savedResult.error) {
      devWarn('[Nice Place] Failed to count saved places:', savedResult.error.message);
    }

    const stats = {
      sharedPlacesCount: sharedResult.count ?? 0,
      savedPlacesCount: savedResult.count ?? 0,
      likesReceived,
    };

    devLog('[Nice Place Profile] stats loaded', profileId, stats);
    return stats;
  } catch (error: unknown) {
    devWarn('[Nice Place] Profile stats request failed:', error);
    return empty;
  }
}

export async function getRecentSavedPlaces(
  profileId: string,
  limit = 3,
): Promise<Place[]> {
  const saved = await getSavedPlaces(profileId);
  return saved.slice(0, limit);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve profiles.id + auth_user_id for places.created_by lookups.
 * auth_user_id is used only for matching legacy rows — never shown in UI.
 */
async function getProfileCreatedByKeys(profileId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return profileId ? [profileId] : [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, auth_user_id')
    .eq('id', profileId)
    .maybeSingle();

  if (error || !data) {
    return [profileId];
  }

  const keys = [data.id as string];
  const authUserId = data.auth_user_id as string | null;
  if (authUserId && authUserId !== data.id) {
    keys.push(authUserId);
  }
  return keys;
}

/**
 * Load a public profile by profiles.id, auth_user_id, or username.
 * Always returns profiles.id (never auth_user_id as the summary id).
 * Selects only: id, auth_user_id, username, avatar_url, bio.
 * auth_user_id is for resolution only — never shown in UI.
 */
export async function getPublicProfile(
  profileIdOrUsername: string,
): Promise<PublicProfileSummary | null> {
  const supabase = getSupabase();
  const target = profileIdOrUsername?.trim();
  if (!supabase || !target) {
    return null;
  }

  devLog('[Nice Place PublicProfile] received profile id:', target);

  if (UUID_RE.test(target)) {
    const byId = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_SELECT)
      .eq('id', target)
      .maybeSingle();

    if (byId.error) {
      devWarn('[Nice Place PublicProfile] profile fetch error:', byId.error.message);
    } else if (byId.data) {
      const profile = mapPublicProfileRow(byId.data as DbPublicProfileRow);
      devLog('[Nice Place PublicProfile] profile loaded:', profile.id, profile.username);
      return profile;
    }

    // Legacy places may store auth.users.id in created_by.
    const byAuth = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_SELECT)
      .eq('auth_user_id', target)
      .maybeSingle();

    if (byAuth.error) {
      devWarn('[Nice Place PublicProfile] profile fetch error:', byAuth.error.message);
      return null;
    }

    if (byAuth.data) {
      const profile = mapPublicProfileRow(byAuth.data as DbPublicProfileRow);
      devLog('[Nice Place PublicProfile] profile loaded:', profile.id, profile.username);
      return profile;
    }

    devLog('[Nice Place PublicProfile] profile not found:', target);
    return null;
  }

  const username = target.startsWith('@') ? target.slice(1) : target;
  const byUsername = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (byUsername.error) {
    devWarn('[Nice Place PublicProfile] profile fetch error:', byUsername.error.message);
    return null;
  }

  if (!byUsername.data) {
    devLog('[Nice Place PublicProfile] profile not found:', target);
    return null;
  }

  const profile = mapPublicProfileRow(byUsername.data as DbPublicProfileRow);
  devLog('[Nice Place PublicProfile] profile loaded:', profile.id, profile.username);
  return profile;
}

export async function getPublicProfileStats(profileId: string): Promise<PublicProfileStats> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return { sharedApprovedCount: 0, likesReceived: 0 };
  }

  const createdByKeys = await getProfileCreatedByKeys(profileId);

  const [placesResult, likesReceived] = await Promise.all([
    supabase
      .from('places')
      .select('id', { count: 'exact', head: true })
      .in('created_by', createdByKeys)
      .eq('status', 'approved'),
    getLikesReceivedForProfile(profileId),
  ]);

  if (placesResult.error) {
    devWarn('[Nice Place PublicProfile] stats fetch error:', placesResult.error.message);
    return { sharedApprovedCount: 0, likesReceived: 0 };
  }

  const stats = {
    sharedApprovedCount: placesResult.count ?? 0,
    likesReceived,
  };

  devLog('[Nice Place Profile] stats loaded', profileId, stats);
  return stats;
}
