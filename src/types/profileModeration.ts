import type {
  ProfileModerationAction,
  ProfileReportReason,
  ProfileReportStatus,
} from '../constants/profileModeration';

export interface DbProfileReport {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  reason: ProfileReportReason | string;
  details: string | null;
  status: ProfileReportStatus | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProfileModerationAction {
  id: string;
  target_user_id: string;
  admin_user_id: string;
  action: ProfileModerationAction | string;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ReportedProfileListItem {
  reported_user_id: string;
  profile_id: string;
  username: string | null;
  avatar_url: string | null;
  account_created_at: string;
  moderation_strikes: number;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  username_reset_required: boolean;
  open_report_count: number;
  total_report_count: number;
  last_report_at: string;
  open_reason_counts: Record<string, number>;
}

export interface ReportedProfileDetail {
  success: boolean;
  error?: string;
  profile?: {
    id: string;
    auth_user_id: string;
    username: string | null;
    avatar_url: string | null;
    avatar_storage_path: string | null;
    created_at: string;
    is_admin: boolean;
    is_suspended: boolean;
    suspended_until: string | null;
    suspension_reason: string | null;
    moderation_strikes: number;
    username_reset_required: boolean;
  };
  open_report_count?: number;
  total_report_count?: number;
  reports?: DbProfileReport[];
  actions?: DbProfileModerationAction[];
}

export interface ProfileModerationState {
  authenticated: boolean;
  has_profile?: boolean;
  profile_id?: string;
  is_suspended?: boolean;
  suspended_until?: string | null;
  suspension_reason?: string | null;
  username_reset_required?: boolean;
  username?: string | null;
  moderation_strikes?: number;
}

export interface ProfileModerationActionResult {
  success: boolean;
  error?: string;
  message?: string;
  action?: string;
  avatar_storage_path?: string | null;
  new_username?: string;
  suspended_until?: string | null;
}
