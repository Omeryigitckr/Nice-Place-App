import { i18n } from '../i18n/instance';

export interface PublicProfileSummary {
  id: string;
  /** Auth user id — used for reporting; do not display in UI. */
  authUserId: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface PublicProfileStats {
  sharedApprovedCount: number;
  likesReceived: number;
}

/** Public display name is username only (no display_name / full_name column). */
export function getPublicDisplayName(profile: PublicProfileSummary): string {
  return profile.username?.trim() || i18n.t('placeDetail.userFallback');
}

export function getPublicUsernameLabel(profile: PublicProfileSummary): string | null {
  const username = profile.username?.trim();
  return username ? `@${username}` : null;
}
