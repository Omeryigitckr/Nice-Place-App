export interface PublicProfileSummary {
  id: string;
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
  return profile.username?.trim() || 'Nice Place user';
}

export function getPublicUsernameLabel(profile: PublicProfileSummary): string | null {
  const username = profile.username?.trim();
  return username ? `@${username}` : null;
}
