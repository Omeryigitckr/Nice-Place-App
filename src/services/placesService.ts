import {
  dedupeRequest,
  readMapPlacesCache,
  readMyPlacesCache,
  readPlaceFromAnyCache,
  writeMapPlacesCache,
  writeMyPlacesCache,
  writePlaceDetailCache,
  writePlacesListCache,
} from '../cache';
import { markNetworkFailure, markNetworkSuccess } from '../network';
import { MOCK_PLACES } from '../constants/mockPlaces';
import { ADD_PLACE_CATEGORY_VALUES } from '../constants/addPlaceOptions';
import { PlaceUpdateRequestInsert } from '../constants/placeUpdateRequestSchema';
import {
  DbAccessType,
  DbCrowdLevel,
  DbDifficultyLevel,
  DbPlace,
  DbPlacePhoto,
  PlaceCategory,
  PlaceStatus,
} from '../types/database';
import { AccessType, CrowdLevel, Difficulty, MapPosition, OwnedPlace, Place } from '../types/place';
import { PublicProfileSummary } from '../types/publicProfile';
import { DISTANCE_UNAVAILABLE } from '../utils/distance';
import { devLog, devWarn, devError } from '../utils/devLog';

import { resolveCurrentUserProfileId } from './authService';
import { enrichPlacesWithEngagement } from './placeEngagementService';
import { getPublicProfile } from './profileService';
import { getSupabase, getSupabaseConfigError, isSupabaseConfigured } from './supabase';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop';

export const PLACE_SELECT = `
  id,
  title,
  description,
  category,
  latitude,
  longitude,
  address_text,
  created_by,
  status,
  verification_count,
  like_count,
  save_count,
  view_count,
  best_time,
  access_type,
  difficulty_level,
  crowd_level,
  is_pet_friendly,
  is_child_friendly,
  is_car_accessible,
  is_camp_allowed,
  is_picnic_suitable,
  safety_note,
  cover_photo_url,
  slug,
  created_at,
  updated_at
`;

const VALID_CATEGORIES: PlaceCategory[] = [
  ...ADD_PLACE_CATEGORY_VALUES,
  'sunrise',
  'quiet_spot',
  'bench',
  'waterside',
  'city_view',
  'photo_spot',
  'camp',
  'stargazing',
  'hiking_start',
];

export interface CreatePlaceInput {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  bestTime: string;
  accessType: DbAccessType;
  difficultyLevel: DbDifficultyLevel;
  crowdLevel: DbCrowdLevel;
  isPetFriendly: boolean;
  isChildFriendly: boolean;
  isCarAccessible: boolean;
  isCampAllowed: boolean;
  isPicnicSuitable: boolean;
  safetyNote?: string;
}

export interface CreatePlaceResult {
  success: boolean;
  placeId?: string;
  error?: string;
}

export interface UpdatePlaceInput {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  bestTime: string;
  accessType: DbAccessType;
  difficultyLevel: DbDifficultyLevel;
  crowdLevel: DbCrowdLevel;
  isPetFriendly: boolean;
  isChildFriendly: boolean;
  isCarAccessible: boolean;
  isCampAllowed: boolean;
  isPicnicSuitable: boolean;
  safetyNote?: string;
  /** Existing cover URL when editable; new uploads still go through place_photos. */
  coverPhotoUrl?: string | null;
}

export interface UpdatePlaceResult {
  success: boolean;
  error?: string;
  /** Set on success: update request vs rejected-place resubmit. */
  action?: 'update_request' | 'resubmit';
}

export interface LoadPlacesResult {
  places: Place[];
  source: 'supabase' | 'mock' | 'cache';
  error?: string;
  fromCache?: boolean;
}

export interface PlaceDetailResult {
  place: Place;
  createdBy: string | null;
  creator: PublicProfileSummary | null;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizePlaceCategory(input: string): PlaceCategory {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  if (VALID_CATEGORIES.includes(slug as PlaceCategory)) {
    return slug as PlaceCategory;
  }

  if (slug.includes('sunset')) return 'sunset';
  if (slug.includes('sunrise')) return 'sunrise';
  if (slug.includes('hidden')) return 'hidden_gem';
  if (slug.includes('waterfall')) return 'waterfall';
  if (slug.includes('beach')) return 'beach';
  if (slug.includes('histor')) return 'historical';
  if (slug.includes('view') || slug.includes('lookout')) return 'viewpoint';
  if (slug.includes('bench')) return 'bench';
  if (slug.includes('water') || slug.includes('river') || slug.includes('lake')) {
    return 'waterside';
  }
  if (slug.includes('forest') || slug.includes('wood')) return 'forest';
  if (slug.includes('camp')) return 'camping';
  if (slug.includes('picnic')) return 'picnic';
  if (slug.includes('star')) return 'stargazing';
  if (slug.includes('hike') || slug.includes('trail')) return 'trail';
  if (slug.includes('photo')) return 'photo_spot';
  if (slug.includes('quiet')) return 'quiet_spot';

  return 'other';
}

function mapAccessType(value: string): AccessType {
  switch (value) {
    case 'car':
      return 'driving';
    case 'public_transport':
      return 'public_transport';
    case 'walking':
    case 'bicycle':
    case 'mixed':
    default:
      return 'walking';
  }
}

function mapDifficulty(value: string): Difficulty {
  switch (value) {
    case 'medium':
      return 'moderate';
    case 'hard':
      return 'hard';
    case 'easy':
    default:
      return 'easy';
  }
}

function mapCrowdLevel(value: string): CrowdLevel {
  switch (value) {
    case 'crowded':
      return 'busy';
    case 'normal':
      return 'moderate';
    case 'quiet':
    default:
      return 'quiet';
  }
}

function deriveTags(category: string): string[] {
  if (category === 'other') {
    return [];
  }
  return category.split('_').filter(Boolean);
}

function computeMapPositions(places: Place[]): Place[] {
  if (places.length === 0) {
    return places;
  }

  const lats = places.map((place) => place.latitude);
  const lngs = places.map((place) => place.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return places.map((place) => {
    const mapPosition: MapPosition = {
      x: 0.15 + ((place.longitude - minLng) / lngRange) * 0.7,
      y: 0.15 + (1 - (place.latitude - minLat) / latRange) * 0.7,
    };

    return { ...place, mapPosition };
  });
}

async function fetchCoverPhotos(
  placeIds: string[],
  options?: { includePending?: boolean },
): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase || placeIds.length === 0) {
    return {};
  }

  let query = supabase
    .from('place_photos')
    .select('place_id, image_url, is_cover, status')
    .in('place_id', placeIds)
    .order('is_cover', { ascending: false });

  if (!options?.includePending) {
    query = query.eq('status', 'approved');
  }

  const { data, error } = await query;

  if (error) {
    devWarn('[Nice Place] Failed to load place photos:', error.message);
    return {};
  }

  const photos = (data ?? []) as Pick<DbPlacePhoto, 'place_id' | 'image_url' | 'is_cover'>[];
  const coverMap: Record<string, string> = {};
  const fallbackMap: Record<string, string> = {};

  for (const photo of photos) {
    if (photo.is_cover && !coverMap[photo.place_id]) {
      coverMap[photo.place_id] = photo.image_url;
    }
    if (!fallbackMap[photo.place_id]) {
      fallbackMap[photo.place_id] = photo.image_url;
    }
  }

  for (const placeId of placeIds) {
    if (!coverMap[placeId] && fallbackMap[placeId]) {
      coverMap[placeId] = fallbackMap[placeId];
    }
  }

  return coverMap;
}

function mapDbPlaceToPlace(row: DbPlace, coverImage?: string): Place {
  const categorySlug = String(row.category ?? 'other');

  return {
    id: row.id,
    title: row.title,
    category: formatCategory(categorySlug),
    categorySlug,
    description: row.description,
    image: coverImage ?? row.cover_photo_url ?? DEFAULT_IMAGE,
    distance: DISTANCE_UNAVAILABLE,
    bestTime: row.best_time ?? 'Anytime',
    accessType: mapAccessType(row.access_type),
    accessTypeSlug: row.access_type ?? 'unknown',
    difficulty: mapDifficulty(row.difficulty_level),
    difficultySlug: row.difficulty_level ?? 'unknown',
    crowdLevel: mapCrowdLevel(row.crowd_level),
    crowdLevelSlug: row.crowd_level ?? 'unknown',
    isPetFriendly: row.is_pet_friendly ?? false,
    isChildFriendly: row.is_child_friendly ?? false,
    isCarAccessible: row.is_car_accessible ?? false,
    isCampAllowed: row.is_camp_allowed ?? false,
    isPicnicSuitable: row.is_picnic_suitable ?? false,
    safetyNote: row.safety_note?.trim() || null,
    likeCount: Math.max(0, row.like_count ?? 0),
    saveCount: Math.max(0, row.save_count ?? 0),
    latitude: row.latitude,
    longitude: row.longitude,
    tags: deriveTags(row.category),
    mapPosition: { x: 0.5, y: 0.5 },
    createdAt: row.created_at,
  };
}

function mapDbPlaceToOwnedPlace(
  row: DbPlace,
  coverImage?: string,
  rejectedResubmitCount = 0,
): OwnedPlace {
  return {
    ...mapDbPlaceToPlace(row, coverImage),
    status: row.status,
    safetyNote: row.safety_note,
    rejectedResubmitCount: Math.max(0, rejectedResubmitCount),
  };
}

const COORD_EPSILON = 1e-6;
const MAX_IDENTICAL_REJECTED_RESUBMITS = 2;

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length === 0 ? null : trimmed;
}

function coordsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= COORD_EPSILON;
}

/** Normalized snapshot used for no-change detection. */
interface PlaceEditSnapshot {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  bestTime: string;
  accessType: string;
  difficultyLevel: string;
  crowdLevel: string;
  isPetFriendly: boolean;
  isChildFriendly: boolean;
  isCarAccessible: boolean;
  isCampAllowed: boolean;
  isPicnicSuitable: boolean;
  safetyNote: string | null;
  coverPhotoUrl: string | null;
}

function snapshotFromOwnedPlace(place: OwnedPlace): PlaceEditSnapshot {
  return {
    title: normalizeText(place.title),
    description: normalizeText(place.description),
    category: normalizeText(place.categorySlug),
    latitude: place.latitude,
    longitude: place.longitude,
    bestTime: normalizeText(place.bestTime) || 'Anytime',
    accessType: place.accessTypeSlug || 'unknown',
    difficultyLevel: place.difficultySlug || 'unknown',
    crowdLevel: place.crowdLevelSlug || 'unknown',
    isPetFriendly: place.isPetFriendly,
    isChildFriendly: place.isChildFriendly,
    isCarAccessible: place.isCarAccessible,
    isCampAllowed: place.isCampAllowed,
    isPicnicSuitable: place.isPicnicSuitable,
    safetyNote: normalizeNullableText(place.safetyNote),
    coverPhotoUrl: normalizeNullableText(place.image),
  };
}

function snapshotFromUpdateInput(
  title: string,
  category: string,
  input: UpdatePlaceInput,
): PlaceEditSnapshot {
  return {
    title,
    description: normalizeText(input.description),
    category,
    latitude: input.latitude,
    longitude: input.longitude,
    bestTime: normalizeText(input.bestTime) || 'Anytime',
    accessType: input.accessType,
    difficultyLevel: input.difficultyLevel,
    crowdLevel: input.crowdLevel,
    isPetFriendly: input.isPetFriendly,
    isChildFriendly: input.isChildFriendly,
    isCarAccessible: input.isCarAccessible,
    isCampAllowed: input.isCampAllowed,
    isPicnicSuitable: input.isPicnicSuitable,
    safetyNote: normalizeNullableText(input.safetyNote),
    coverPhotoUrl: normalizeNullableText(input.coverPhotoUrl),
  };
}

function placeSnapshotsEqual(a: PlaceEditSnapshot, b: PlaceEditSnapshot): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.category === b.category &&
    coordsEqual(a.latitude, b.latitude) &&
    coordsEqual(a.longitude, b.longitude) &&
    a.bestTime === b.bestTime &&
    a.accessType === b.accessType &&
    a.difficultyLevel === b.difficultyLevel &&
    a.crowdLevel === b.crowdLevel &&
    a.isPetFriendly === b.isPetFriendly &&
    a.isChildFriendly === b.isChildFriendly &&
    a.isCarAccessible === b.isCarAccessible &&
    a.isCampAllowed === b.isCampAllowed &&
    a.isPicnicSuitable === b.isPicnicSuitable &&
    a.safetyNote === b.safetyNote &&
    a.coverPhotoUrl === b.coverPhotoUrl
  );
}

export async function mapDbRowsToPlaces(rows: DbPlace[]): Promise<Place[]> {
  if (rows.length === 0) {
    return [];
  }

  const coverMap = await fetchCoverPhotos(rows.map((row) => row.id));
  const places = rows.map((row) => mapDbPlaceToPlace(row, coverMap[row.id]));
  const positioned = computeMapPositions(places);
  return enrichPlacesWithEngagement(positioned);
}

async function fetchApprovedPlaces(orderBy?: {
  column: 'like_count' | 'created_at';
  ascending?: boolean;
}): Promise<Place[] | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const orderKey = orderBy
    ? `${orderBy.column}:${orderBy.ascending === true ? 'asc' : 'desc'}`
    : 'default';

  return dedupeRequest(`places:approved:${orderKey}`, async () => {
    let query = supabase.from('places').select(PLACE_SELECT).eq('status', 'approved');

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    }

    const { data, error } = await query;

    if (error) {
      devWarn('[Nice Place] Failed to load places:', error.message);
      return null;
    }

    const places = await mapDbRowsToPlaces((data ?? []) as DbPlace[]);
    writePlacesListCache(places);
    return places;
  });
}

export async function getApprovedPlaces(): Promise<Place[] | null> {
  const remote = await fetchApprovedPlaces();
  if (remote !== null) {
    markNetworkSuccess();
    return remote;
  }

  const cached = await readMapPlacesCache({ allowExpired: true });
  if (cached) {
    markNetworkFailure();
  }
  return cached;
}

export async function getPlacesSortedByMostLiked(): Promise<Place[] | null> {
  return fetchApprovedPlaces({ column: 'like_count', ascending: false });
}

export async function getPlacesSortedByNewest(): Promise<Place[] | null> {
  return fetchApprovedPlaces({ column: 'created_at', ascending: false });
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const detail = await getPlaceDetail(id);
  return detail?.place ?? null;
}

export async function getPlaceDetail(id: string): Promise<PlaceDetailResult | null> {
  if (!id) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return readPlaceFromAnyCache(id);
  }

  try {
    const result = await dedupeRequest(`place:detail:${id}`, async () => {
      const { data, error } = await supabase
        .from('places')
        .select(PLACE_SELECT)
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle();

      if (error) {
        devWarn('[Nice Place] Failed to load place:', error.message);
        return null;
      }

      if (!data) {
        return null;
      }

      const row = data as DbPlace;
      const [place] = await mapDbRowsToPlaces([row]);
      if (!place) {
        return null;
      }

      const createdBy = row.created_by;
      devLog('[Nice Place PlaceDetail] place.created_by:', createdBy);

      const creator = createdBy ? await getPublicProfile(createdBy) : null;

      if (creator) {
        devLog(
          '[Nice Place PlaceDetail] creator profile loaded:',
          creator.id,
          creator.username,
        );
      } else if (createdBy) {
        devLog('[Nice Place PlaceDetail] creator profile not found:', createdBy);
      }

      const detail: PlaceDetailResult = { place, createdBy, creator };
      writePlaceDetailCache(detail);
      return detail;
    });

    if (result) {
      markNetworkSuccess();
      return result;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place] Place detail request failed:', error);
  }

  const cached = await readPlaceFromAnyCache(id);
  if (cached) {
    markNetworkFailure();
  }
  return cached;
}

export async function getApprovedPlacesByCreator(profileId: string): Promise<Place[]> {
  const supabase = getSupabase();
  if (!supabase || !profileId) {
    return [];
  }

  // Match both profiles.id and auth_user_id for legacy created_by values.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, auth_user_id')
    .eq('id', profileId)
    .maybeSingle();

  const createdByKeys = [profileId];
  const authUserId = profileRow?.auth_user_id as string | null | undefined;
  if (authUserId && authUserId !== profileId) {
    createdByKeys.push(authUserId);
  }

  const { data, error } = await supabase
    .from('places')
    .select(PLACE_SELECT)
    .in('created_by', createdByKeys)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    devWarn('[Nice Place PublicProfile] places fetch error:', error.message);
    return [];
  }

  // mapDbRowsToPlaces already enriches like/save counts from engagement tables.
  return mapDbRowsToPlaces((data ?? []) as DbPlace[]);
}

export async function createPlace(input: CreatePlaceInput): Promise<CreatePlaceResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, error: 'Place name is required.' };
  }

  const categoryInput = input.category.trim();
  if (!categoryInput) {
    return { success: false, error: 'Please select a category.' };
  }

  const category = normalizePlaceCategory(categoryInput);
  if (!ADD_PLACE_CATEGORY_VALUES.includes(category as (typeof ADD_PLACE_CATEGORY_VALUES)[number])) {
    return { success: false, error: 'Please select a valid category.' };
  }

  const { profileId, authUserId, error: profileError } = await resolveCurrentUserProfileId();

  if (!profileId) {
    return { success: false, error: profileError ?? 'Sign in to share a place.' };
  }

  if (profileId === authUserId) {
    devWarn(
      '[Nice Place] profileId matches auth user id — created_by must be profiles.id, not auth.users.id',
    );
    return {
      success: false,
      error: 'Profile lookup returned the wrong id. Try signing out and back in.',
    };
  }

  const payload = {
    title,
    description: input.description.trim(),
    category,
    latitude: input.latitude,
    longitude: input.longitude,
    created_by: profileId,
    status: 'pending' as const,
    best_time: input.bestTime,
    access_type: input.accessType,
    difficulty_level: input.difficultyLevel,
    crowd_level: input.crowdLevel,
    is_pet_friendly: input.isPetFriendly,
    is_child_friendly: input.isChildFriendly,
    is_car_accessible: input.isCarAccessible,
    is_camp_allowed: input.isCampAllowed,
    is_picnic_suitable: input.isPicnicSuitable,
    safety_note: input.safetyNote?.trim() || null,
  };

  const { data, error: insertError } = await supabase.from('places').insert(payload).select('id').single();

  if (insertError) {
    if (insertError.message.includes('row-level security')) {
      return {
        success: false,
        error:
          'Could not submit place. Your profile may not be set up correctly — try signing out and back in.',
      };
    }
    return { success: false, error: insertError.message };
  }

  return { success: true, placeId: (data as { id: string }).id };
}

export async function loadPlacesForMap(
  sort: 'nearby' | 'most_liked' | 'new',
): Promise<LoadPlacesResult> {
  if (!isSupabaseConfigured()) {
    return {
      places: MOCK_PLACES,
      source: 'mock',
      error: getSupabaseConfigError() ?? 'Supabase is not configured.',
    };
  }

  let remote: Place[] | null = null;

  try {
    if (sort === 'most_liked') {
      remote = await getPlacesSortedByMostLiked();
    } else if (sort === 'new') {
      remote = await getPlacesSortedByNewest();
    } else {
      // Use network path only — getApprovedPlaces already falls back to cache.
      remote = await fetchApprovedPlaces();
    }
  } catch (error: unknown) {
    devWarn('[Nice Place] Map places request failed:', error);
    remote = null;
  }

  if (remote !== null) {
    writeMapPlacesCache(remote);
    markNetworkSuccess();
    return { places: remote, source: 'supabase' };
  }

  const cached = await readMapPlacesCache({ allowExpired: true });
  if (cached?.length) {
    markNetworkFailure();
    return {
      places: cached,
      source: 'cache',
      fromCache: true,
      error: 'Showing cached places. Connect to refresh.',
    };
  }

  markNetworkFailure();
  return {
    places: [],
    source: 'supabase',
    error: 'Could not load places from Supabase.',
  };
}

export async function getMyPlaces(profileId: string): Promise<OwnedPlace[]> {
  if (!profileId) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await readMyPlacesCache(profileId, { allowExpired: true })) ?? [];
  }

  try {
    const places = await dedupeRequest(`places:mine:${profileId}`, async () => {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, auth_user_id')
        .eq('id', profileId)
        .maybeSingle();

      const createdByKeys = [profileId];
      const authUserId = profileRow?.auth_user_id as string | null | undefined;
      if (authUserId && authUserId !== profileId) {
        createdByKeys.push(authUserId);
      }

      const { data, error } = await supabase
        .from('places')
        .select(PLACE_SELECT)
        .in('created_by', createdByKeys)
        .order('created_at', { ascending: false });

      if (error) {
        devWarn('[Nice Place] Failed to load your places:', error.message);
        return null;
      }

      const rows = (data ?? []) as DbPlace[];
      if (rows.length === 0) {
        writeMyPlacesCache(profileId, []);
        return [] as OwnedPlace[];
      }

      const coverMap = await fetchCoverPhotos(
        rows.map((row) => row.id),
        { includePending: true },
      );

      const owned = rows.map((row) => mapDbPlaceToOwnedPlace(row, coverMap[row.id]));
      const enriched = (await enrichPlacesWithEngagement(owned)) as OwnedPlace[];
      writeMyPlacesCache(profileId, enriched);
      return enriched;
    });

    if (places !== null) {
      markNetworkSuccess();
      return places;
    }
  } catch (error: unknown) {
    devWarn('[Nice Place] My places request failed:', error);
  }

  const cached = (await readMyPlacesCache(profileId, { allowExpired: true })) ?? [];
  if (cached.length > 0) {
    markNetworkFailure();
  }
  return cached;
}

export async function getMyPlaceById(placeId: string, profileId: string): Promise<OwnedPlace | null> {
  const supabase = getSupabase();
  if (!supabase || !placeId || !profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from('places')
    .select(PLACE_SELECT)
    .eq('id', placeId)
    .eq('created_by', profileId)
    .maybeSingle();

  if (error) {
    devWarn('[Nice Place] Failed to load your place:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as DbPlace;
  const coverMap = await fetchCoverPhotos([row.id], { includePending: true });

  // Optional column — only needed for rejected resubmit limits.
  let rejectedResubmitCount = 0;
  const countResult = await supabase
    .from('places')
    .select('rejected_resubmit_count')
    .eq('id', placeId)
    .maybeSingle();

  if (!countResult.error && countResult.data) {
    const raw = (countResult.data as { rejected_resubmit_count?: number | null })
      .rejected_resubmit_count;
    rejectedResubmitCount = Math.max(0, raw ?? 0);
  } else if (countResult.error) {
    devWarn(
      '[Nice Place] rejected_resubmit_count unavailable:',
      countResult.error.message,
      'Run scripts/2026_07_04_places_rejected_resubmit_count.sql',
    );
  }

  return mapDbPlaceToOwnedPlace(row, coverMap[row.id], rejectedResubmitCount);
}

export async function updateMyPlace(
  placeId: string,
  input: UpdatePlaceInput,
): Promise<UpdatePlaceResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, error: 'Place name is required.' };
  }

  const categoryInput = input.category.trim();
  if (!categoryInput) {
    return { success: false, error: 'Please select a category.' };
  }

  const category = normalizePlaceCategory(categoryInput);
  if (!ADD_PLACE_CATEGORY_VALUES.includes(category as (typeof ADD_PLACE_CATEGORY_VALUES)[number])) {
    return { success: false, error: 'Please select a valid category.' };
  }

  const { profileId, authUserId, error: profileError } = await resolveCurrentUserProfileId();
  if (!profileId || !authUserId) {
    return { success: false, error: profileError ?? 'Sign in to edit a place.' };
  }

  const existing = await getMyPlaceById(placeId, profileId);
  if (!existing) {
    return { success: false, error: 'Place not found or you do not have permission to edit it.' };
  }

  if (existing.status === 'pending') {
    return {
      success: false,
      error: 'This place is still pending review and cannot be updated yet.',
    };
  }

  if (existing.status !== 'approved' && existing.status !== 'rejected') {
    return {
      success: false,
      error: 'This place cannot be edited.',
    };
  }

  const nextSnapshot = snapshotFromUpdateInput(title, category, input);
  const previousSnapshot = snapshotFromOwnedPlace(existing);
  const unchanged = placeSnapshotsEqual(previousSnapshot, nextSnapshot);

  // Approved places: update-request flow only (never touch live place here).
  if (existing.status === 'approved') {
    if (unchanged) {
      return { success: false, error: 'No changes to submit.' };
    }

    const payload: PlaceUpdateRequestInsert = {
      place_id: placeId,
      user_id: authUserId,
      title: nextSnapshot.title,
      description: nextSnapshot.description,
      category: nextSnapshot.category,
      latitude: nextSnapshot.latitude,
      longitude: nextSnapshot.longitude,
      access_type: nextSnapshot.accessType as PlaceUpdateRequestInsert['access_type'],
      best_time: nextSnapshot.bestTime,
      difficulty_level: nextSnapshot.difficultyLevel as PlaceUpdateRequestInsert['difficulty_level'],
      crowd_level: nextSnapshot.crowdLevel as PlaceUpdateRequestInsert['crowd_level'],
      is_pet_friendly: nextSnapshot.isPetFriendly,
      is_child_friendly: nextSnapshot.isChildFriendly,
      is_car_accessible: nextSnapshot.isCarAccessible,
      is_camp_allowed: nextSnapshot.isCampAllowed,
      is_picnic_suitable: nextSnapshot.isPicnicSuitable,
      safety_note: nextSnapshot.safetyNote,
      cover_photo_url: nextSnapshot.coverPhotoUrl,
      status: 'pending',
    };

    devLog('[Nice Place] final place_update_requests payload', payload);

    const { data: insertedRow, error: insertError } = await supabase
      .from('place_update_requests')
      .insert(payload)
      .select('id, status, place_id')
      .single();

    if (insertError) {
      devError('[Nice Place] place_update_requests insert failed:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        payload,
      });

      if (insertError.message.includes('row-level security')) {
        return {
          success: false,
          error: 'Could not submit update. You may not have permission to edit this place.',
        };
      }

      if (insertError.code === 'PGRST204') {
        return {
          success: false,
          error: 'Update request schema is out of date. Please try again later.',
        };
      }

      return {
        success: false,
        error: 'Could not submit your update for review. Please try again.',
      };
    }

    devLog('[Nice Place] place_update_requests insert succeeded:', insertedRow);
    return { success: true, action: 'update_request' };
  }

  // Rejected places: direct resubmit to pending (not update-request flow).
  // Unchanged: max 2 identical resubmits via rejected_resubmit_count.
  // Changed: apply fields, status=pending, reset rejected_resubmit_count to 0
  // so each new version gets its own 2 identical retries.
  if (unchanged) {
    if (existing.rejectedResubmitCount >= MAX_IDENTICAL_REJECTED_RESUBMITS) {
      return {
        success: false,
        error: 'You can only resubmit the same rejected place 2 times.',
      };
    }

    const nextCount = existing.rejectedResubmitCount + 1;
    const { data, error } = await supabase
      .from('places')
      .update({
        status: 'pending',
        rejected_resubmit_count: nextCount,
      })
      .eq('id', placeId)
      .eq('created_by', profileId)
      .eq('status', 'rejected')
      .select('id, status, rejected_resubmit_count');

    const row = data?.[0];
    devLog('[Nice Place] rejected identical resubmit', {
      placeId,
      nextCount,
      dataLength: data?.length ?? 0,
      returned: data ?? [],
      error: error?.message ?? null,
    });

    if (error) {
      if (error.code === 'PGRST204' || error.message.toLowerCase().includes('rejected_resubmit_count')) {
        return {
          success: false,
          error: 'Resubmit is not available yet. Please try again later.',
        };
      }
      return { success: false, error: 'Could not resubmit this place. Please try again.' };
    }

    if (!row || row.status !== 'pending') {
      return { success: false, error: 'Could not resubmit this place. Please try again.' };
    }

    return { success: true, action: 'resubmit' };
  }

  const { data, error } = await supabase
    .from('places')
    .update({
      title: nextSnapshot.title,
      description: nextSnapshot.description,
      category: nextSnapshot.category,
      latitude: nextSnapshot.latitude,
      longitude: nextSnapshot.longitude,
      access_type: nextSnapshot.accessType,
      best_time: nextSnapshot.bestTime,
      difficulty_level: nextSnapshot.difficultyLevel,
      crowd_level: nextSnapshot.crowdLevel,
      is_pet_friendly: nextSnapshot.isPetFriendly,
      is_child_friendly: nextSnapshot.isChildFriendly,
      is_car_accessible: nextSnapshot.isCarAccessible,
      is_camp_allowed: nextSnapshot.isCampAllowed,
      is_picnic_suitable: nextSnapshot.isPicnicSuitable,
      safety_note: nextSnapshot.safetyNote,
      cover_photo_url: nextSnapshot.coverPhotoUrl,
      status: 'pending',
      rejected_resubmit_count: 0,
    })
    .eq('id', placeId)
    .eq('created_by', profileId)
    .eq('status', 'rejected')
    .select('id, status, rejected_resubmit_count');

  const row = data?.[0];
  devLog('[Nice Place] rejected changed resubmit', {
    placeId,
    dataLength: data?.length ?? 0,
    returned: data ?? [],
    error: error?.message ?? null,
  });

  if (error) {
    if (error.code === 'PGRST204' || error.message.toLowerCase().includes('rejected_resubmit_count')) {
      return {
        success: false,
        error: 'Resubmit is not available yet. Please try again later.',
      };
    }
    return { success: false, error: 'Could not resubmit this place. Please try again.' };
  }

  if (!row || row.status !== 'pending') {
    return { success: false, error: 'Could not resubmit this place. Please try again.' };
  }

  return { success: true, action: 'resubmit' };
}
