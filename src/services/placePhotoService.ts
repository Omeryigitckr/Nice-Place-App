import { PLACE_PHOTOS_BUCKET } from '../constants/storage';
import { devLog, devWarn, devError } from '../utils/devLog';

import { getSupabase } from './supabase';

export { PLACE_PHOTOS_BUCKET };

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

function buildStoragePath(authUserId: string, placeId: string): string {
  return `${authUserId}/${placeId}/${Date.now()}.jpg`;
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the selected image.');
  }
  return response.arrayBuffer();
}

/**
 * Upload a place cover photo to the shared PLACE_PHOTOS_BUCKET.
 * Used by both Add Place and Edit Place — do not call storage with another bucket name.
 */
export async function uploadPlaceCoverPhoto(
  input: UploadPlaceCoverPhotoInput,
): Promise<UploadPlaceCoverPhotoResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!input.placeId || !input.imageUri || !input.authUserId || !input.profileId) {
    return { success: false, error: 'Missing data required for photo upload.' };
  }

  const requirePlacePhotoRow = input.requirePlacePhotoRow !== false;
  const storagePath = buildStoragePath(input.authUserId, input.placeId);

  devLog('[Nice Place] using storage bucket:', PLACE_PHOTOS_BUCKET);
  devLog('[Nice Place] upload path:', storagePath);

  try {
    const fileData = await uriToArrayBuffer(input.imageUri);

    const { error: uploadError } = await supabase.storage
      .from(PLACE_PHOTOS_BUCKET)
      .upload(storagePath, fileData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      devError('[Nice Place] storage upload failed:', {
        bucket: PLACE_PHOTOS_BUCKET,
        path: storagePath,
        message: uploadError.message,
      });
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(PLACE_PHOTOS_BUCKET)
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;
    if (!imageUrl) {
      await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([storagePath]);
      return { success: false, error: 'Could not resolve the uploaded image URL.' };
    }

    const { error: insertError } = await supabase.from('place_photos').insert({
      place_id: input.placeId,
      uploaded_by: input.profileId,
      image_url: imageUrl,
      storage_path: storagePath,
      is_cover: true,
      status: 'pending',
    });

    if (insertError) {
      if (requirePlacePhotoRow) {
        await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([storagePath]);
        return { success: false, error: insertError.message };
      }

      devWarn(
        '[Nice Place] place_photos row insert failed; using storage URL for update request:',
        insertError.message,
      );
    }

    return { success: true, imageUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Photo upload failed.';
    devError('[Nice Place] storage upload exception:', message);
    return { success: false, error: message };
  }
}
