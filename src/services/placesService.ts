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
import {
  MAX_PLACE_CATEGORIES,
  MIN_PLACE_CATEGORIES,
  PLACE_CATEGORY_KEYS,
  categoryKeyListsEqual,
  deriveTagsFromCategories,
  formatPrimaryCategoryLabel,
  getPlaceCategoryLabel,
  mapLegacyCategoryKey,
  normalizePlaceCategories,
  PlaceCategoryKey,
} from '../constants/placeCategories';
import { PlaceUpdateRequestInsert } from '../constants/placeUpdateRequestSchema';
import {
  DbAccessType,
  DbCrowdLevel,
  DbDifficultyLevel,
  DbPlace,
  PlaceStatus,
} from '../types/database';
import { AccessType, CrowdLevel, Difficulty, MapPosition, OwnedPlace, Place } from '../types/place';
import { PublicProfileSummary } from '../types/publicProfile';
import { getDistanceUnavailableLabel } from '../utils/distance';
import { devWarn, devError } from '../utils/devLog';

import { resolveCurrentUserProfileId } from './authService';
import { enrichPlacesWithEngagement } from './placeEngagementService';
import {
  fetchPlaceCategoriesByPlaceIds,
  fetchPlaceCategoryKeys,
  insertPlaceCategories,
  syncPlaceCategories,
} from './placeCategoryService';
import {
  fetchCoverPhotosByPlaceIds,
  fetchPlacePhotoListsByPlaceIds,
  getCoverPhoto,
  getPlacePhotoUrls,
  normalizePlacePhotoUrls,
  syncPlacePhotos,
} from './placePhotoService';
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

const VALID_CATEGORIES: PlaceCategoryKey[] = [...PLACE_CATEGORY_KEYS];

export interface CreatePlaceInput {
  title: string;
  description: string;
  categories: string[];
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
  categories: string[];
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
  /** Final ordered photo URLs (1–3) for edit submissions. */
  photoUrls?: string[];
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
  return getPlaceCategoryLabel(category);
}

/** @deprecated Use normalizePlaceCategories — kept for imports. */
export function normalizePlaceCategory(input: string): PlaceCategoryKey {
  const normalized = normalizePlaceCategories(input);
  return normalized[0] ?? mapLegacyCategoryKey(input) ?? 'hidden_gem';
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
  return deriveTagsFromCategories(normalizePlaceCategories(category));
}

function resolvePlacePhotos(
  row: DbPlace,
  photoList?: string[],
  coverImage?: string,
): string[] | undefined {
  if (photoList && photoList.length > 0) {
    return photoList;
  }

  const cover = coverImage ?? row.cover_photo_url ?? null;
  return cover ? [cover] : undefined;
}

function resolvePlaceCategories(row: DbPlace, categoryList?: string[]): PlaceCategoryKey[] {
  const fromJoin = normalizePlaceCategories(categoryList ?? []);
  if (fromJoin.length > 0) {
    return fromJoin;
  }
  const legacy = normalizePlaceCategories(row.category);
  return legacy.length > 0 ? legacy : ['hidden_gem'];
}

function mapDbPlaceToPlace(
  row: DbPlace,
  coverImage?: string,
  photoList?: string[],
  categoryList?: string[],
): Place {
  const categories = resolvePlaceCategories(row, categoryList);
  const categorySlug = categories[0];
  const photos = resolvePlacePhotos(row, photoList, coverImage);
  const image =
    getCoverPhoto(photos ?? [], coverImage ?? row.cover_photo_url) ?? DEFAULT_IMAGE;

  const shell: Pick<Place, 'categories' | 'categorySlug' | 'category'> = {
    categories,
    categorySlug,
    category: getPlaceCategoryLabel(categorySlug),
  };

  return {
    id: row.id,
    title: row.title,
    category: formatPrimaryCategoryLabel(shell),
    categorySlug,
    categories,
    description: row.description,
    image,
    photos,
    distance: getDistanceUnavailableLabel(),
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
    tags: deriveTagsFromCategories(categories),
    mapPosition: { x: 0.5, y: 0.5 },
    createdAt: row.created_at,
  };
}

function mapDbPlaceToOwnedPlace(
  row: DbPlace,
  coverImage?: string,
  rejectedResubmitCount = 0,
  photoList?: string[],
  categoryList?: string[],
): OwnedPlace {
  return {
    ...mapDbPlaceToPlace(row, coverImage, photoList, categoryList),
    status: row.status,
    safetyNote: row.safety_note,
    rejectedResubmitCount: Math.max(0, rejectedResubmitCount),
  };
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
  return fetchCoverPhotosByPlaceIds(placeIds, options);
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
  categoryKeys: PlaceCategoryKey[];
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
  photoUrls: string[];
}

function snapshotFromOwnedPlace(place: OwnedPlace): PlaceEditSnapshot {
  return {
    title: normalizeText(place.title),
    description: normalizeText(place.description),
    categoryKeys: normalizePlaceCategories(
      place.categories?.length ? place.categories : place.categorySlug,
    ),
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
    photoUrls: normalizePlacePhotoUrls(place.photos ?? (place.image ? [place.image] : [])),
  };
}

function snapshotFromUpdateInput(title: string, input: UpdatePlaceInput): PlaceEditSnapshot {
  return {
    title,
    description: normalizeText(input.description),
    categoryKeys: normalizePlaceCategories(input.categories),
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
    photoUrls: normalizePlacePhotoUrls(
      input.photoUrls ??
        (input.coverPhotoUrl ? [input.coverPhotoUrl] : []),
    ),
  };
}

function photoUrlListsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((url, index) => url === b[index]);
}

function placeSnapshotsEqual(a: PlaceEditSnapshot, b: PlaceEditSnapshot): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    categoryKeyListsEqual(a.categoryKeys, b.categoryKeys) &&
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
    a.coverPhotoUrl === b.coverPhotoUrl &&
    photoUrlListsEqual(a.photoUrls, b.photoUrls)
  );
}

export async function mapDbRowsToPlaces(rows: DbPlace[]): Promise<Place[]> {
  if (rows.length === 0) {
    return [];
  }

  const coverMap = await fetchCoverPhotos(rows.map((row) => row.id));
  const photoLists = await fetchPlacePhotoListsByPlaceIds(rows.map((row) => row.id));
  const categoryMap = await fetchPlaceCategoriesByPlaceIds(rows.map((row) => row.id));
  const places = rows.map((row) =>
    mapDbPlaceToPlace(row, coverMap[row.id], photoLists[row.id], categoryMap[row.id]),
  );
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

      const creator = createdBy ? await getPublicProfile(createdBy) : null;

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
    return { success: false, error: 'auth.errors.configMissing' };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, error: 'placeForm.validation.nameRequired' };
  }

  const categoryKeys = normalizePlaceCategories(input.categories);
  if (categoryKeys.length < MIN_PLACE_CATEGORIES) {
    return { success: false, error: 'placeForm.errors.categoriesRequired' };
  }
  if (categoryKeys.length > MAX_PLACE_CATEGORIES) {
    return { success: false, error: 'placeForm.validation.categoriesMax' };
  }

  const primaryCategory = categoryKeys[0];

  const { profileId, authUserId, error: profileError } = await resolveCurrentUserProfileId();

  if (!profileId) {
    return { success: false, error: profileError ?? 'placeForm.errors.signInToShare' };
  }

  if (profileId === authUserId) {
    devWarn(
      '[Nice Place] profileId matches auth user id — created_by must be profiles.id, not auth.users.id',
    );
    return {
      success: false,
      error: 'placeForm.errors.profileLookupMismatch',
    };
  }

  const payload = {
    title,
    description: input.description.trim(),
    category: primaryCategory,
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
          'placeForm.errors.submitProfileIssue',
      };
    }
    return { success: false, error: insertError.message };
  }

  const placeId = (data as { id: string }).id;
  const categoryResult = await insertPlaceCategories(placeId, categoryKeys);
  if (!categoryResult.success) {
    devWarn('[Nice Place] place_categories insert failed:', categoryResult.error);
    return {
      success: false,
      error: categoryResult.error ?? 'Place saved, but categories could not be linked.',
    };
  }

  return { success: true, placeId };
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
      error: 'explore.load.cached',
    };
  }

  markNetworkFailure();
  return {
    places: [],
    source: 'supabase',
    error: 'explore.load.supabaseFailed',
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
      const photoLists = await fetchPlacePhotoListsByPlaceIds(rows.map((row) => row.id), {
        includePending: true,
      });
      const categoryMap = await fetchPlaceCategoriesByPlaceIds(rows.map((row) => row.id));

      const owned = rows.map((row) =>
        mapDbPlaceToOwnedPlace(
          row,
          coverMap[row.id],
          0,
          photoLists[row.id],
          categoryMap[row.id],
        ),
      );
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
  const photoUrls = await getPlacePhotoUrls(row.id, row.cover_photo_url, {
    includePending: true,
  });
  const categoryKeys = await fetchPlaceCategoryKeys(row.id);

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

  return mapDbPlaceToOwnedPlace(
    row,
    coverMap[row.id],
    rejectedResubmitCount,
    photoUrls.length > 0 ? photoUrls : undefined,
    categoryKeys,
  );
}

export async function updateMyPlace(
  placeId: string,
  input: UpdatePlaceInput,
): Promise<UpdatePlaceResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, error: 'placeForm.validation.nameRequired' };
  }

  const categoryKeys = normalizePlaceCategories(input.categories);
  if (categoryKeys.length < MIN_PLACE_CATEGORIES) {
    return { success: false, error: 'placeForm.errors.categoriesRequired' };
  }
  if (categoryKeys.length > MAX_PLACE_CATEGORIES) {
    return { success: false, error: 'placeForm.validation.categoriesMax' };
  }

  const { profileId, authUserId, error: profileError } = await resolveCurrentUserProfileId();
  if (!profileId || !authUserId) {
    return { success: false, error: profileError ?? 'placeForm.errors.signInToEdit' };
  }

  const existing = await getMyPlaceById(placeId, profileId);
  if (!existing) {
    return { success: false, error: 'placeForm.errors.notFound' };
  }

  if (existing.status === 'pending') {
    return {
      success: false,
      error: 'placeForm.errors.pendingCannotEdit',
    };
  }

  if (existing.status !== 'approved' && existing.status !== 'rejected') {
    return {
      success: false,
      error: 'placeForm.errors.cannotEdit',
    };
  }

  const nextSnapshot = snapshotFromUpdateInput(title, input);
  const previousSnapshot = snapshotFromOwnedPlace(existing);
  const unchanged = placeSnapshotsEqual(previousSnapshot, nextSnapshot);
  const nextPhotoUrls = nextSnapshot.photoUrls;
  const photosChanged = !photoUrlListsEqual(previousSnapshot.photoUrls, nextPhotoUrls);
  const categoriesChanged = !categoryKeyListsEqual(
    previousSnapshot.categoryKeys,
    nextSnapshot.categoryKeys,
  );
  const primaryCategory = nextSnapshot.categoryKeys[0];

  // Approved places: update-request flow only (never touch live place here).
  if (existing.status === 'approved') {
    if (unchanged) {
      return { success: false, error: 'placeForm.errors.noChanges' };
    }

    const payload: PlaceUpdateRequestInsert = {
      place_id: placeId,
      user_id: authUserId,
      title: nextSnapshot.title,
      description: nextSnapshot.description,
      category: primaryCategory,
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
      photo_urls: photosChanged ? nextPhotoUrls : null,
      category_keys: categoriesChanged ? nextSnapshot.categoryKeys : null,
      status: 'pending',
    };

    const { error: insertError } = await supabase
      .from('place_update_requests')
      .insert(payload)
      .select('id, status, place_id')
      .single();

    if (insertError) {
      devError('[Nice Place] place_update_requests insert failed:', insertError.message);

      if (insertError.message.includes('row-level security')) {
        return {
          success: false,
          error: 'placeForm.errors.updatePermission',
        };
      }

      if (insertError.code === 'PGRST204') {
        return {
          success: false,
          error: 'placeForm.errors.updateSchema',
        };
      }

      return {
        success: false,
        error: 'placeForm.errors.updateFailed',
      };
    }

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
        error: 'placeForm.errors.resubmitLimit',
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

    if (error) {
      if (error.code === 'PGRST204' || error.message.toLowerCase().includes('rejected_resubmit_count')) {
        return {
          success: false,
          error: 'placeForm.errors.resubmitUnavailable',
        };
      }
      return { success: false, error: 'placeForm.errors.resubmitFailed' };
    }

    if (!row || row.status !== 'pending') {
      return { success: false, error: 'placeForm.errors.resubmitFailed' };
    }

    return { success: true, action: 'resubmit' };
  }

  const { data, error } = await supabase
    .from('places')
    .update({
      title: nextSnapshot.title,
      description: nextSnapshot.description,
      category: primaryCategory,
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

  if (error) {
    if (error.code === 'PGRST204' || error.message.toLowerCase().includes('rejected_resubmit_count')) {
      return {
        success: false,
        error: 'placeForm.errors.resubmitUnavailable',
      };
    }
    return { success: false, error: 'placeForm.errors.resubmitFailed' };
  }

  if (!row || row.status !== 'pending') {
    return { success: false, error: 'placeForm.errors.resubmitFailed' };
  }

  if (photosChanged && nextPhotoUrls.length > 0) {
    const syncResult = await syncPlacePhotos({
      placeId,
      imageUrls: nextPhotoUrls,
      status: 'pending',
      profileId,
      replaceExisting: true,
    });

    if (!syncResult.success) {
      return {
        success: false,
        error: syncResult.error ?? 'placeForm.errors.photoSyncFailed',
      };
    }
  }

  if (categoriesChanged) {
    const categorySync = await syncPlaceCategories({
      placeId,
      categoryKeys: nextSnapshot.categoryKeys,
    });

    if (!categorySync.success) {
      return {
        success: false,
        error: categorySync.error ?? 'placeForm.errors.categorySyncFailed',
      };
    }
  }

  return { success: true, action: 'resubmit' };
}
