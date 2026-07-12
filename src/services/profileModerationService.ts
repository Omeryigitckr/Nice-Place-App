import { PROFILE_AVATARS_BUCKET } from '../constants/storage';
import {
  PROFILE_MODERATION_ACTIONS,
  type ProfileModerationAction,
  type ProfileReportReason,
} from '../constants/profileModeration';
import type {
  ProfileModerationActionResult,
  ProfileModerationState,
  ReportedProfileDetail,
  ReportedProfileListItem,
} from '../types/profileModeration';
import { devLog, devWarn } from '../utils/devLog';

import { getSupabase } from './supabase';

export interface ReportProfileResult {
  success: boolean;
  reportId?: string;
  error?: string;
  message?: string;
}

function mapRpcError(payload: Record<string, unknown> | null): ReportProfileResult {
  const error = typeof payload?.error === 'string' ? payload.error : 'unknown';
  const messageByCode: Record<string, string> = {
    not_authenticated: 'profile.report.errors.not_authenticated',
    self_report: 'profile.report.errors.self_report',
    daily_limit: 'profile.report.errors.daily_limit',
    invalid_username: 'profile.moderation.usernameReset.invalid',
    username_taken: 'profile.errors.usernameTaken',
    not_configured: 'auth.errors.configMissing',
  };
  return {
    success: false,
    error,
    message: messageByCode[error] ?? 'profile.report.errors.generic',
  };
}

export async function reportProfile(input: {
  reportedAuthUserId: string;
  reason: ProfileReportReason;
  details?: string;
}): Promise<ReportProfileResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'not_configured', message: 'auth.errors.configMissing' };
  }

  const { data, error } = await supabase.rpc('report_profile', {
    p_reported_user_id: input.reportedAuthUserId,
    p_reason: input.reason,
    p_details: input.details?.trim() || null,
  });

  if (error) {
    devWarn('[Nice Place Moderation] report_profile failed:', error.message);
    return { success: false, error: 'rpc_error', message: 'profile.report.errors.rpc_error' };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload?.success) {
    return mapRpcError(payload);
  }

  return {
    success: true,
    reportId: typeof payload.report_id === 'string' ? payload.report_id : undefined,
  };
}

export async function getMyModerationState(): Promise<ProfileModerationState> {
  const supabase = getSupabase();
  if (!supabase) {
    return { authenticated: false };
  }

  const { data, error } = await supabase.rpc('get_my_moderation_state');
  if (error) {
    devWarn('[Nice Place Moderation] get_my_moderation_state failed:', error.message);
    return { authenticated: false };
  }

  return (data ?? { authenticated: false }) as ProfileModerationState;
}

export async function completeUsernameReset(username: string): Promise<ReportProfileResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'not_configured', message: 'auth.errors.configMissing' };
  }

  const { data, error } = await supabase.rpc('complete_username_reset', {
    p_username: username,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: 'profile.moderation.usernameReset.saveFailed' };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload?.success) {
    return mapRpcError(payload);
  }

  return { success: true };
}

export async function adminListReportedProfiles(): Promise<{
  profiles: ReportedProfileListItem[];
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { profiles: [], error: 'admin.errors.notConfigured' };
  }

  const { data, error } = await supabase.rpc('admin_list_reported_profiles');
  if (error) {
    devWarn('[Nice Place Moderation] list failed:', error.message);
    return { profiles: [], error: error.message };
  }

  const list = Array.isArray(data) ? (data as ReportedProfileListItem[]) : [];
  return { profiles: list };
}

export async function adminGetReportedProfileDetail(
  reportedAuthUserId: string,
): Promise<ReportedProfileDetail> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'not_configured' };
  }

  const { data, error } = await supabase.rpc('admin_get_reported_profile_detail', {
    p_reported_user_id: reportedAuthUserId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return (data ?? { success: false, error: 'empty' }) as ReportedProfileDetail;
}

export async function adminModerateProfile(input: {
  targetAuthUserId: string;
  action: Exclude<ProfileModerationAction, 'delete_account'>;
  reason: string;
  adminNote?: string;
  metadata?: Record<string, unknown>;
}): Promise<ProfileModerationActionResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'not_configured', message: 'admin.errors.notConfigured' };
  }

  const { data, error } = await supabase.rpc('admin_moderate_profile', {
    p_target_user_id: input.targetAuthUserId,
    p_action: input.action,
    p_reason: input.reason,
    p_admin_note: input.adminNote ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    devWarn('[Nice Place Moderation] moderate failed:', error.message);
    return { success: false, error: 'rpc_error', message: error.message };
  }

  const payload = (data ?? {}) as ProfileModerationActionResult & Record<string, unknown>;
  if (!payload.success) {
    return {
      success: false,
      error: typeof payload.error === 'string' ? payload.error : 'failed',
      message: typeof payload.message === 'string' ? payload.message : 'admin.errors.actionFailedShort',
    };
  }

  // Best-effort storage cleanup after photo removal.
  if (
    input.action === PROFILE_MODERATION_ACTIONS.REMOVE_PROFILE_PHOTO &&
    typeof payload.avatar_storage_path === 'string' &&
    payload.avatar_storage_path.length > 0
  ) {
    const path = payload.avatar_storage_path;
    const { error: storageError } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .remove([path]);
    if (storageError) {
      devWarn('[Nice Place Moderation] avatar storage delete failed:', storageError.message);
    } else if (__DEV__) {
      devLog('[Nice Place Moderation] avatar storage deleted');
    }
  }

  return payload;
}

export async function adminDeleteUserAccount(input: {
  targetAuthUserId: string;
  reason: string;
}): Promise<ProfileModerationActionResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'not_configured', message: 'admin.errors.notConfigured' };
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {
      adminDeleteUserId: input.targetAuthUserId,
      reason: input.reason,
    },
  });

  if (error) {
    devWarn('[Nice Place Moderation] admin delete failed:', error.message);
    return { success: false, error: 'rpc_error', message: error.message };
  }

  const payload = data as { success?: boolean; error?: string } | null;
  if (!payload?.success) {
    return {
      success: false,
      error: 'delete_failed',
      message: payload?.error ?? 'admin.errors.deleteAccountFailed',
    };
  }

  return { success: true, action: PROFILE_MODERATION_ACTIONS.DELETE_ACCOUNT };
}

/** True when suspension is active (indefinite or not yet expired). */
export function isSuspensionActive(input: {
  isSuspended?: boolean | null;
  suspendedUntil?: string | null;
  nowMs?: number;
}): boolean {
  if (!input.isSuspended) {
    return false;
  }
  if (!input.suspendedUntil) {
    return true;
  }
  const until = new Date(input.suspendedUntil).getTime();
  if (!Number.isFinite(until)) {
    return true;
  }
  return until > (input.nowMs ?? Date.now());
}
