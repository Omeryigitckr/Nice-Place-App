/** Profile report reasons — keep in sync with SQL check constraint. */
export const PROFILE_REPORT_REASONS = {
  INAPPROPRIATE_PHOTO: 'inappropriate_photo',
  INAPPROPRIATE_USERNAME: 'inappropriate_username',
  IMPERSONATION: 'impersonation',
  SPAM: 'spam',
  HARASSMENT_OR_HATE: 'harassment_or_hate',
  OTHER: 'other',
} as const;

export type ProfileReportReason =
  (typeof PROFILE_REPORT_REASONS)[keyof typeof PROFILE_REPORT_REASONS];

export const PROFILE_REPORT_REASON_LIST = Object.values(PROFILE_REPORT_REASONS);

/** @deprecated Prefer PROFILE_REPORT_REASON_KEYS + t() / getProfileReportReasonLabel. */
export const PROFILE_REPORT_REASON_LABELS: Record<ProfileReportReason, string> = {
  inappropriate_photo: 'profile.report.reasons.inappropriate_photo',
  inappropriate_username: 'profile.report.reasons.inappropriate_username',
  impersonation: 'profile.report.reasons.impersonation',
  spam: 'profile.report.reasons.spam',
  harassment_or_hate: 'profile.report.reasons.harassment_or_hate',
  other: 'profile.report.reasons.other',
};

export const PROFILE_REPORT_STATUSES = {
  OPEN: 'open',
  RESOLVED_NO_ACTION: 'resolved_no_action',
  RESOLVED_ACTION_TAKEN: 'resolved_action_taken',
  DISMISSED_ABUSE: 'dismissed_abuse',
} as const;

export type ProfileReportStatus =
  (typeof PROFILE_REPORT_STATUSES)[keyof typeof PROFILE_REPORT_STATUSES];

export const PROFILE_MODERATION_ACTIONS = {
  MARK_OK: 'mark_ok',
  REMOVE_PROFILE_PHOTO: 'remove_profile_photo',
  RESET_USERNAME: 'reset_username',
  SUSPEND_24H: 'suspend_24h',
  SUSPEND_7D: 'suspend_7d',
  SUSPEND_30D: 'suspend_30d',
  SUSPEND_INDEFINITE: 'suspend_indefinite',
  UNSUSPEND: 'unsuspend',
  DELETE_ACCOUNT: 'delete_account',
  DISMISS_REPORT_ABUSE: 'dismiss_report_abuse',
} as const;

export type ProfileModerationAction =
  (typeof PROFILE_MODERATION_ACTIONS)[keyof typeof PROFILE_MODERATION_ACTIONS];

/** @deprecated Prefer PROFILE_MODERATION_ACTION_KEYS + t() / getModerationActionLabel. */
export const PROFILE_MODERATION_ACTION_LABELS: Record<ProfileModerationAction, string> = {
  mark_ok: 'admin.actionLabels.mark_ok',
  remove_profile_photo: 'admin.actionLabels.remove_profile_photo',
  reset_username: 'admin.actionLabels.reset_username',
  suspend_24h: 'admin.actionLabels.suspend_24h',
  suspend_7d: 'admin.actionLabels.suspend_7d',
  suspend_30d: 'admin.actionLabels.suspend_30d',
  suspend_indefinite: 'admin.actionLabels.suspend_indefinite',
  unsuspend: 'admin.actionLabels.unsuspend',
  delete_account: 'admin.actionLabels.delete_account',
  dismiss_report_abuse: 'admin.actionLabels.dismiss_report_abuse',
};

export const PROFILE_REPORT_DETAILS_MAX = 300;
export const PROFILE_REPORTS_DAILY_LIMIT = 10;
