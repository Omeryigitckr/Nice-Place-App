import { i18n } from '../i18n/instance';
import { PLACE_PHOTOS_BUCKET } from '../constants/storage';
import { DbPlacePhoto } from '../types/database';
import { devLog, devWarn, devError } from '../utils/devLog';

import { getSupabase } from './supabase';

export { PLACE_PHOTOS_BUCKET };

export const MIN_PLACE_PHOTOS = 1;
export const MAX_PLACE_PHOTOS = 3;

export type PlacePhotoStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface PlacePhotoRecord {
  id: string;
  placeId: string;
  imageUrl: string;
  orderIndex: number;
  isCover: boolean;
  status: string;
}

export interface UploadPlaceCoverPhotoInput {
  placeId: string;
  imageUri: string;
  authUserId: string;
  profileId: string;
  /**
   * When true (default), a place_photos row is required (place creation).
   * When false (place update requests), storage URL is enough and place_photos is best-effort.
   */
  requirePlacePhotoRow?: boolean;
}

export interface UploadPlaceCoverPhotoResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface UploadPlacePhotosInput {
  placeId: string;
  imageUris: string[];
  authUserId: string;
  profileId: string;
  requirePlacePhotoRow?: boolean;
  status?: PlacePhotoStatus;
  /** When false, only uploads to storage (for approved-place edit requests). Default true. */
  insertPlacePhotoRows?: boolean;
  /** When false, does not update places.cover_photo_url. Default true. */
  updateCoverPhoto?: boolean;
}

export interface UploadPlacePhotosResult {
  success: boolean;
  imageUrls?: string[];
  error?: string;
}

export interface SyncPlacePhotosInput {
  placeId: string;
  imageUrls: string[];
  status: PlacePhotoStatus;
  profileId?: string | null;
  /** When true, hide existing approved/pending photos before inserting the new set. */
  replaceExisting?: boolean;
}

export interface SyncPlacePhotosResult {
  success: boolean;
  error?: string;
}

export interface GetPlacePhotosOptions {
  includePending?: boolean;
  /** When set, only return photos with this status. */
  status?: PlacePhotoStatus;
}

function buildStoragePath(authUserId: string, placeId: string, index: number): string {
  return `${authUserId}/${placeId}/${Date.now()}_${index}.jpg`;
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('placeForm.errors.photoReadFailed');
  }
  return response.arrayBuffer();
}

function mapDbPhoto(row: DbPlacePhoto): PlacePhotoRecord {
  return {
    id: row.id,
    placeId: row.place_id,
    imageUrl: row.image_url,
    orderIndex: row.order_index ?? 0,
    isCover: row.is_cover,
    status: row.status,
  };
}

/** Resolve cover URL from an ordered photo list, with optional fallback. */
export function getCoverPhoto(photos: string[], fallbackUrl?: string | null): string | null {
  const first = photos.find((url) => url.trim().length > 0);
  if (first) {
    return first;
  }
  const fallback = fallbackUrl?.trim();
  return fallback && fallback.length > 0 ? fallback : null;
}

/** Normalize and validate an ordered photo URL list (1–3 items). */
export function normalizePlacePhotoUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    normalized.push(url);
    if (normalized.length >= MAX_PLACE_PHOTOS) {
      break;
    }
  }

  return normalized;
}

function sortPhotoRecords(photos: PlacePhotoRecord[]): PlacePhotoRecord[] {
  return photos.slice().sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }
    return a.isCover === b.isCover ? 0 : a.isCover ? -1 : 1;
  });
}

/** Load ordered photo URLs for a place. Falls back to empty when none exist. */
export async function getPlacePhotos(
  placeId: string,
  options?: GetPlacePhotosOptions,
): Promise<PlacePhotoRecord[]> {
  const supabase = getSupabase();
  if (!supabase || !placeId) {
    return [];
  }

  let query = supabase
    .from('place_photos')
    .select('id, place_id, image_url, order_index, is_cover, status, created_at')
    .eq('place_id', placeId)
    .neq('status', 'hidden')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (options?.status) {
    query = query.eq('status', options.status);
  } else if (!options?.includePending) {
    query = query.eq('status', 'approved');
  }

  const { data, error } = await query;

  if (error) {
    devWarn('[Nice Place] getPlacePhotos failed:', error.message);
    return [];
  }

  const mapped = ((data ?? []) as DbPlacePhoto[]).map(mapDbPhoto);
  return sortPhotoRecords(mapped);
}

/** Ordered public URLs for a place; uses cover_photo_url when place_photos is empty. */
export async function getPlacePhotoUrls(
  placeId: string,
  fallbackCoverUrl?: string | null,
  options?: GetPlacePhotosOptions,
): Promise<string[]> {
  const records = await getPlacePhotos(placeId, options);
  const urls = records.map((photo) => photo.imageUrl).filter(Boolean);

  if (urls.length > 0) {
    return urls;
  }

  const fallback = fallbackCoverUrl?.trim();
  return fallback ? [fallback] : [];
}

/** Batch-load cover URLs for map/card display. */
export async function fetchCoverPhotosByPlaceIds(
  placeIds: string[],
  options?: { includePending?: boolean },
): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase || placeIds.length === 0) {
    return {};
  }

  let query = supabase
    .from('place_photos')
    .select('place_id, image_url, is_cover, order_index, status')
    .in('place_id', placeIds)
    .neq('status', 'hidden')
    .order('order_index', { ascending: true })
    .order('is_cover', { ascending: false });

  if (!options?.includePending) {
    query = query.eq('status', 'approved');
  }

  const { data, error } = await query;

  if (error) {
    devWarn('[Nice Place] Failed to load place photos:', error.message);
    return {};
  }

  const photos = (data ?? []) as Pick<
    DbPlacePhoto,
    'place_id' | 'image_url' | 'is_cover' | 'order_index'
  >[];

  const coverMap: Record<string, string> = {};

  for (const photo of photos) {
    if (!coverMap[photo.place_id]) {
      coverMap[photo.place_id] = photo.image_url;
    } else if (photo.is_cover) {
      coverMap[photo.place_id] = photo.image_url;
    }
  }

  return coverMap;
}

/** Batch-load ordered photo URL lists keyed by place id. */
export async function fetchPlacePhotoListsByPlaceIds(
  placeIds: string[],
  options?: { includePending?: boolean },
): Promise<Record<string, string[]>> {
  const supabase = getSupabase();
  if (!supabase || placeIds.length === 0) {
    return {};
  }

  let query = supabase
    .from('place_photos')
    .select('place_id, image_url, order_index, status')
    .in('place_id', placeIds)
    .neq('status', 'hidden')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (!options?.includePending) {
    query = query.eq('status', 'approved');
  }

  const { data, error } = await query;

  if (error) {
    devWarn('[Nice Place] Failed to load place photo lists:', error.message);
    return {};
  }

  const lists: Record<string, string[]> = {};

  for (const row of (data ?? []) as Pick<DbPlacePhoto, 'place_id' | 'image_url'>[]) {
    if (!lists[row.place_id]) {
      lists[row.place_id] = [];
    }
    if (!lists[row.place_id].includes(row.image_url)) {
      lists[row.place_id].push(row.image_url);
    }
  }

  return lists;
}

/**
 * Upload 1–3 photos to storage and insert place_photos rows in order.
 * First photo is always the cover. Updates places.cover_photo_url.
 */
export async function uploadPlacePhotos(
  input: UploadPlacePhotosInput,
): Promise<UploadPlacePhotosResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }

  const imageUris = input.imageUris.filter(Boolean);
  if (imageUris.length < MIN_PLACE_PHOTOS || imageUris.length > MAX_PLACE_PHOTOS) {
    return {
      success: false,
      error: i18n.t('placeForm.validation.photosRange', {
        min: MIN_PLACE_PHOTOS,
        max: MAX_PLACE_PHOTOS,
      }),
    };
  }

  if (!input.placeId || !input.authUserId || !input.profileId) {
    return { success: false, error: 'placeForm.errors.photoMissingData' };
  }

  const requirePlacePhotoRow = input.requirePlacePhotoRow !== false;
  const insertPlacePhotoRows = input.insertPlacePhotoRows !== false;
  const updateCoverPhoto = input.updateCoverPhoto !== false;
  const status = input.status ?? 'pending';
  const uploadedPaths: string[] = [];
  const imageUrls: string[] = [];

  devLog('[Nice Place] uploading place photos:', imageUris.length);

  try {
    for (let index = 0; index < imageUris.length; index += 1) {
      const storagePath = buildStoragePath(input.authUserId, input.placeId, index);
      const fileData = await uriToArrayBuffer(imageUris[index]);

      const { error: uploadError } = await supabase.storage
        .from(PLACE_PHOTOS_BUCKET)
        .upload(storagePath, fileData, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        devError('[Nice Place] storage upload failed:', uploadError.message);
        await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(uploadedPaths);
        return { success: false, error: uploadError.message };
      }

      uploadedPaths.push(storagePath);

      const { data: publicUrlData } = supabase.storage
        .from(PLACE_PHOTOS_BUCKET)
        .getPublicUrl(storagePath);

      const imageUrl = publicUrlData.publicUrl;
      if (!imageUrl) {
        await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(uploadedPaths);
        return { success: false, error: 'placeForm.errors.photoUrlUnresolved' };
      }

      imageUrls.push(imageUrl);

      if (insertPlacePhotoRows) {
        const { error: insertError } = await supabase.from('place_photos').insert({
          place_id: input.placeId,
          uploaded_by: input.profileId,
          image_url: imageUrl,
          storage_path: storagePath,
          is_cover: index === 0,
          order_index: index,
          status,
        });

        if (insertError) {
          if (requirePlacePhotoRow) {
            await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(uploadedPaths);
            return { success: false, error: insertError.message };
          }

          devWarn(
            '[Nice Place] place_photos row insert failed; using storage URL for update request:',
            insertError.message,
          );
        }
      }
    }

    const coverUrl = getCoverPhoto(imageUrls);
    if (updateCoverPhoto && coverUrl) {
      const { error: coverUpdateError } = await supabase
        .from('places')
        .update({ cover_photo_url: coverUrl })
        .eq('id', input.placeId);

      if (coverUpdateError) {
        devWarn('[Nice Place] cover_photo_url update failed:', coverUpdateError.message);
      }
    }

    return { success: true, imageUrls };
  } catch (error) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(uploadedPaths);
    const technical =
      error instanceof Error ? error.message : 'Photo upload failed.';
    devError('[Nice Place] uploadPlacePhotos exception:', technical);
    return { success: false, error: 'placeForm.errors.photoUploadFailed' };
  }
}

/**
 * Replace/sync the canonical photo set for a place (admin approval or rejected resubmit).
 * Hides previous visible photos instead of deleting them.
 */
export async function syncPlacePhotos(input: SyncPlacePhotosInput): Promise<SyncPlacePhotosResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }

  const imageUrls = normalizePlacePhotoUrls(input.imageUrls);
  if (imageUrls.length < MIN_PLACE_PHOTOS || imageUrls.length > MAX_PLACE_PHOTOS) {
    return {
      success: false,
      error: 'placeForm.validation.photosSetRange',
    };
  }

  if (input.replaceExisting !== false) {
    const { error: hideError } = await supabase
      .from('place_photos')
      .update({ status: 'hidden', is_cover: false })
      .eq('place_id', input.placeId)
      .in('status', ['approved', 'pending']);

    if (hideError) {
      devWarn('[Nice Place] syncPlacePhotos hide existing failed:', hideError.message);
      return { success: false, error: hideError.message };
    }
  }

  const rows = imageUrls.map((imageUrl, index) => ({
    place_id: input.placeId,
    uploaded_by: input.profileId ?? null,
    image_url: imageUrl,
    storage_path: null,
    is_cover: index === 0,
    order_index: index,
    status: input.status,
  }));

  const { error: insertError } = await supabase.from('place_photos').insert(rows);

  if (insertError) {
    devError('[Nice Place] syncPlacePhotos insert failed:', insertError.message);
    return { success: false, error: insertError.message };
  }

  const coverUrl = getCoverPhoto(imageUrls);
  if (coverUrl) {
    const { error: coverUpdateError } = await supabase
      .from('places')
      .update({ cover_photo_url: coverUrl })
      .eq('id', input.placeId);

    if (coverUpdateError) {
      devWarn('[Nice Place] syncPlacePhotos cover_photo_url update failed:', coverUpdateError.message);
    }
  }

  return { success: true };
}

/**
 * Upload a single place cover photo (backward-compatible wrapper).
 * Prefer uploadPlacePhotos for new multi-photo flows.
 */
export async function uploadPlaceCoverPhoto(
  input: UploadPlaceCoverPhotoInput,
): Promise<UploadPlaceCoverPhotoResult> {
  const result = await uploadPlacePhotos({
    placeId: input.placeId,
    imageUris: [input.imageUri],
    authUserId: input.authUserId,
    profileId: input.profileId,
    requirePlacePhotoRow: input.requirePlacePhotoRow,
  });

  return {
    success: result.success,
    imageUrl: result.imageUrls?.[0],
    error: result.error,
  };
}

/** Approve all pending photos for a place and ensure cover/order flags are correct. */
export async function approvePendingPlacePhotos(placeId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !placeId) {
    return;
  }

  const { error: approveError } = await supabase
    .from('place_photos')
    .update({ status: 'approved' })
    .eq('place_id', placeId)
    .eq('status', 'pending');

  if (approveError) {
    devWarn('[Nice Place] approve pending place photos failed:', approveError.message);
  }

  const photos = await getPlacePhotos(placeId, { includePending: true, status: 'approved' });
  const ordered = sortPhotoRecords(photos);

  for (let index = 0; index < ordered.length; index += 1) {
    const photo = ordered[index];
    const { error } = await supabase
      .from('place_photos')
      .update({ order_index: index, is_cover: index === 0 })
      .eq('id', photo.id);

    if (error) {
      devWarn('[Nice Place] place photo order sync failed:', error.message);
    }
  }

  const coverUrl = getCoverPhoto(ordered.map((photo) => photo.imageUrl));
  if (coverUrl) {
    const { error: coverSyncError } = await supabase
      .from('places')
      .update({ cover_photo_url: coverUrl })
      .eq('id', placeId);

    if (coverSyncError) {
      devWarn('[Nice Place] cover_photo_url sync failed:', coverSyncError.message);
    }
  }
}
