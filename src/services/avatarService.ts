import { PROFILE_AVATARS_BUCKET } from '../constants/storage';
import { devLog, devError } from '../utils/devLog';

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
    throw new Error('Could not read the selected image.');
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
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!input.profileId || !input.authUserId || !input.imageUri) {
    return { success: false, error: 'Missing data required for avatar upload.' };
  }

  const storagePath = buildAvatarStoragePath(input.authUserId);

  devLog('[Nice Place Profile] avatar upload started');
  devLog('[Nice Place Profile] using storage bucket:', PROFILE_AVATARS_BUCKET);
  devLog('[Nice Place Profile] upload path:', storagePath);

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
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    if (!publicUrl) {
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([storagePath]);
      devError('[Nice Place Profile] avatar upload failed:', 'Missing public URL');
      return { success: false, error: 'Could not resolve the uploaded avatar URL.' };
    }

    // Cache-bust so the UI refreshes without an app restart.
    const avatarUrl = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    devLog('[Nice Place Profile] avatar upload success:', avatarUrl);

    devLog('[Nice Place Profile] profile avatar update started');

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
      return { success: false, error: updateError.message };
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
        error: 'Could not save avatar to your profile. Please try again.',
      };
    }

    devLog('[Nice Place Profile] profile avatar update success:', updatedProfile.avatar_url);

    if (input.previousStoragePath && input.previousStoragePath !== storagePath) {
      await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([input.previousStoragePath]);
    }

    return {
      success: true,
      avatarUrl: updatedProfile.avatar_url,
      storagePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Avatar upload failed.';
    devError('[Nice Place Profile] avatar upload failed:', message);
    return { success: false, error: message };
  }
}
