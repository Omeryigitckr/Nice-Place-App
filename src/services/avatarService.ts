import { PROFILE_AVATARS_BUCKET } from '../constants/storage';
import { devError } from '../utils/devLog';

import { getSupabase } from './supabase';

export { PROFILE_AVATARS_BUCKET };

export interface UploadProfileAvatarInput {
  profileId: string;
  authUserId: string;
  imageUri: string;
  previousStoragePath?: string | null;
}

export interface UploadProfileAvatarResult {
  success: boolean;
  avatarUrl?: string;
  storagePath?: string;
  error?: string;
}

function buildAvatarStoragePath(authUserId: string): string {
  return `${authUserId}/avatar_${Date.now()}.jpg`;
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('profile.photo.readFailed');
  }
  return response.arrayBuffer();
}

/**
 * Upload a profile avatar to PROFILE_AVATARS_BUCKET, then update profiles.avatar_url.
 */
export async function uploadProfileAvatar(
  input: UploadProfileAvatarInput,
): Promise<UploadProfileAvatarResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }

  if (!input.profileId || !input.authUserId || !input.imageUri) {
    return { success: false, error: 'profile.photo.missingData' };
  }

  const storagePath = buildAvatarStoragePath(input.authUserId);

  try {
    const fileData = await uriToArrayBuffer(input.imageUri);

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .upload(storagePath, fileData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      devError('[Nice Place Profile] avatar upload failed:', uploadError.message);
      return { success: false, error: 'profile.photo.uploadFailed' };
    }

    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    if (!publicUrl) {
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([storagePath]);
      devError('[Nice Place Profile] avatar upload failed:', 'Missing public URL');
      return { success: false, error: 'profile.photo.urlUnresolved' };
    }

    // Cache-bust so the UI refreshes without an app restart.
    const avatarUrl = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        avatar_storage_path: storagePath,
      })
      .eq('id', input.profileId)
      .eq('auth_user_id', input.authUserId)
      .select('id, avatar_url')
      .maybeSingle();

    if (updateError) {
      devError('[Nice Place Profile] profile avatar update failed:', updateError.message);
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([storagePath]);
      return { success: false, error: 'profile.photo.saveFailed' };
    }

    // RLS can block updates with no error and 0 rows.
    if (!updatedProfile?.avatar_url) {
      devError(
        '[Nice Place Profile] profile avatar update failed:',
        'No profile row updated — check profiles update RLS',
      );
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([storagePath]);
      return {
        success: false,
        error: 'profile.photo.saveFailed',
      };
    }

    if (input.previousStoragePath && input.previousStoragePath !== storagePath) {
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([input.previousStoragePath]);
    }

    return {
      success: true,
      avatarUrl: updatedProfile.avatar_url,
      storagePath,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith('profile.')
        ? error.message
        : 'profile.photo.uploadFailed';
    devError('[Nice Place Profile] avatar upload failed:', error);
    return { success: false, error: message };
  }
}

export interface RemoveProfileAvatarInput {
  profileId: string;
  authUserId: string;
  storagePath?: string | null;
}

export interface RemoveProfileAvatarResult {
  success: boolean;
  error?: string;
}

let removeAvatarInFlight = false;

/**
 * Clear the profile avatar in the database and delete the storage object when present.
 * Safe when the user has no photo. Idempotent for concurrent calls.
 */
export async function removeProfileAvatar(
  input: RemoveProfileAvatarInput,
): Promise<RemoveProfileAvatarResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'auth.errors.configMissing' };
  }

  if (!input.profileId || !input.authUserId) {
    return { success: false, error: 'profile.auth.removePhoto' };
  }

  if (removeAvatarInFlight) {
    return { success: false, error: 'common.pleaseWait' };
  }

  removeAvatarInFlight = true;

  try {
    const { data: current, error: readError } = await supabase
      .from('profiles')
      .select('avatar_url, avatar_storage_path')
      .eq('id', input.profileId)
      .eq('auth_user_id', input.authUserId)
      .maybeSingle();

    if (readError) {
      devError('[Nice Place Profile] avatar remove read failed:', readError.message);
      return { success: false, error: 'profile.photo.removeFailed' };
    }

    const storagePath =
      input.storagePath?.trim() ||
      (current?.avatar_storage_path as string | null | undefined)?.trim() ||
      null;
    const hasAvatar = Boolean(
      current?.avatar_url || storagePath,
    );

    if (!hasAvatar) {
      return { success: true };
    }

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        avatar_storage_path: null,
      })
      .eq('id', input.profileId)
      .eq('auth_user_id', input.authUserId)
      .select('id, avatar_url')
      .maybeSingle();

    if (updateError) {
      devError('[Nice Place Profile] avatar remove update failed:', updateError.message);
      return { success: false, error: 'profile.photo.removeFailed' };
    }

    if (!updated) {
      return {
        success: false,
        error: 'profile.photo.profileUpdateFailed',
      };
    }

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .remove([storagePath]);
      if (storageError) {
        // DB is already cleared — surface a soft warning but treat as success for the UI.
        devError('[Nice Place Profile] avatar storage delete failed:', storageError.message);
      }
    }

    return { success: true };
  } catch (error) {
    devError('[Nice Place Profile] avatar remove failed:', error);
    return { success: false, error: 'profile.photo.removeFailed' };
  } finally {
    removeAvatarInFlight = false;
  }
}
