import { i18n } from '../i18n/instance';
import type {
  ProfileModerationAction,
  ProfileReportReason,
  ProfileReportStatus,
} from '../constants/profileModeration';
import {
  PROFILE_MODERATION_ACTIONS,
  PROFILE_REPORT_REASONS,
  PROFILE_REPORT_STATUSES,
} from '../constants/profileModeration';
import type { SupportedLanguage } from '../i18n/types';
import { isSupportedLanguage } from '../i18n/types';

/** Typed confirm phrase for permanent admin account deletion — do not localize. */
export const ADMIN_DELETE_USER_PHRASE = 'DELETE USER';

/** Stable default reason stored when optional moderation reason is empty. */
export const ADMIN_DEFAULT_MODERATION_REASON = 'No additional reason provided';

const LOCALE_TAGS: Record<SupportedLanguage, string> = {
  tr: 'tr-TR',
  en: 'en',
  es: 'es-ES',
  de: 'de-DE',
  ru: 'ru-RU',
};

export function getAdminLocaleTag(language?: string): string {
  const code = (language ?? i18n.language)?.split('-')[0] ?? 'en';
  const supported = isSupportedLanguage(code) ? code : 'en';
  return LOCALE_TAGS[supported];
}

export function formatAdminDateTime(value: string, language?: string): string {
  try {
    return new Date(value).toLocaleString(getAdminLocaleTag(language));
  } catch {
    return value;
  }
}

export function formatAdminDate(value: string, language?: string): string {
  try {
    return new Date(value).toLocaleDateString(getAdminLocaleTag(language));
  } catch {
    return value;
  }
}

export const PROFILE_REPORT_REASON_KEYS: Record<ProfileReportReason, string> = {
  [PROFILE_REPORT_REASONS.INAPPROPRIATE_PHOTO]: 'profile.report.reasons.inappropriate_photo',
  [PROFILE_REPORT_REASONS.INAPPROPRIATE_USERNAME]: 'profile.report.reasons.inappropriate_username',
  [PROFILE_REPORT_REASONS.IMPERSONATION]: 'profile.report.reasons.impersonation',
  [PROFILE_REPORT_REASONS.SPAM]: 'profile.report.reasons.spam',
  [PROFILE_REPORT_REASONS.HARASSMENT_OR_HATE]: 'profile.report.reasons.harassment_or_hate',
  [PROFILE_REPORT_REASONS.OTHER]: 'profile.report.reasons.other',
};

export const PROFILE_MODERATION_ACTION_KEYS: Record<ProfileModerationAction, string> = {
  [PROFILE_MODERATION_ACTIONS.MARK_OK]: 'admin.actionLabels.mark_ok',
  [PROFILE_MODERATION_ACTIONS.REMOVE_PROFILE_PHOTO]: 'admin.actionLabels.remove_profile_photo',
  [PROFILE_MODERATION_ACTIONS.RESET_USERNAME]: 'admin.actionLabels.reset_username',
  [PROFILE_MODERATION_ACTIONS.SUSPEND_24H]: 'admin.actionLabels.suspend_24h',
  [PROFILE_MODERATION_ACTIONS.SUSPEND_7D]: 'admin.actionLabels.suspend_7d',
  [PROFILE_MODERATION_ACTIONS.SUSPEND_30D]: 'admin.actionLabels.suspend_30d',
  [PROFILE_MODERATION_ACTIONS.SUSPEND_INDEFINITE]: 'admin.actionLabels.suspend_indefinite',
  [PROFILE_MODERATION_ACTIONS.UNSUSPEND]: 'admin.actionLabels.unsuspend',
  [PROFILE_MODERATION_ACTIONS.DELETE_ACCOUNT]: 'admin.actionLabels.delete_account',
  [PROFILE_MODERATION_ACTIONS.DISMISS_REPORT_ABUSE]: 'admin.actionLabels.dismiss_report_abuse',
};

const PLACE_STATUS_KEYS = {
  pending: 'admin.status.pending',
  approved: 'admin.status.approved',
  rejected: 'admin.status.rejected',
  deleted: 'admin.status.deleted',
} as const;

const REPORT_STATUS_KEYS: Record<ProfileReportStatus, string> = {
  [PROFILE_REPORT_STATUSES.OPEN]: 'admin.status.open',
  [PROFILE_REPORT_STATUSES.RESOLVED_NO_ACTION]: 'admin.status.resolved_no_action',
  [PROFILE_REPORT_STATUSES.RESOLVED_ACTION_TAKEN]: 'admin.status.resolved_action_taken',
  [PROFILE_REPORT_STATUSES.DISMISSED_ABUSE]: 'admin.status.dismissed_abuse',
};

export function getProfileReportReasonLabel(reason: string): string {
  const key = PROFILE_REPORT_REASON_KEYS[reason as ProfileReportReason];
  if (key) {
    return String(i18n.t(key as never));
  }
  return reason;
}

export function getModerationActionLabel(action: string): string {
  const key = PROFILE_MODERATION_ACTION_KEYS[action as ProfileModerationAction];
  if (key) {
    return String(i18n.t(key as never));
  }
  return action;
}

export function getPlaceStatusLabel(status: string): string {
  const key = PLACE_STATUS_KEYS[status as keyof typeof PLACE_STATUS_KEYS];
  if (key) {
    return String(i18n.t(key as never));
  }
  return status;
}

export function getReportStatusLabel(status: string): string {
  const key = REPORT_STATUS_KEYS[status as ProfileReportStatus];
  if (key) {
    return String(i18n.t(key as never));
  }
  return status;
}

/**
 * Localizes admin service / access messages that return translation keys.
 */
export function localizeAdminMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  if (
    message.startsWith('admin.') ||
    message.startsWith('profile.') ||
    message.startsWith('placeDetail.') ||
    message.startsWith('errors.') ||
    message.startsWith('common.') ||
    message.startsWith('network.') ||
    message.startsWith('auth.') ||
    message.startsWith('settings.') ||
    message.startsWith('notifications.')
  ) {
    return String(i18n.t(message as never));
  }

  return message;
}

/** True when a queue/list error should be hidden (access already gated in UI). */
export function isAdminAccessGateMessage(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }
  return (
    message === 'admin.errors.noAccess' ||
    message === 'admin.errors.signInAsAdmin' ||
    message === 'admin.errors.verifyFailed' ||
    message === 'admin.errors.verifyFailedRetry' ||
    message.toLowerCase().includes('admin access') ||
    message.toLowerCase().includes('sign in as an admin')
  );
}
