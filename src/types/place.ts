import { PlaceStatus } from './database';

export type AccessType = 'walking' | 'driving' | 'public_transport';
export type Difficulty = 'easy' | 'moderate' | 'hard';
export type CrowdLevel = 'quiet' | 'moderate' | 'busy';
export type QuickFilter = 'nearby' | 'hidden_gems' | 'sunset' | 'camping';

/** @deprecated Use QuickFilter */
export type SortOption = QuickFilter;

export interface MapPosition {
  x: number;
  y: number;
}

export interface Place {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  description: string;
  image: string;
  distance: string;
  bestTime: string;
  accessType: AccessType;
  accessTypeSlug: string;
  difficulty: Difficulty;
  difficultySlug: string;
  crowdLevel: CrowdLevel;
  crowdLevelSlug: string;
  isPetFriendly: boolean;
  isChildFriendly: boolean;
  isCarAccessible: boolean;
  isCampAllowed: boolean;
  isPicnicSuitable: boolean;
  safetyNote: string | null;
  likeCount: number;
  saveCount: number;
  /** Present when engagement was loaded from place_likes / saved_places. */
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
  latitude: number;
  longitude: number;
  tags: string[];
  mapPosition: MapPosition;
  createdAt: string;
}

export interface OwnedPlace extends Place {
  status: PlaceStatus;
  safetyNote: string | null;
  /** Identical rejected-place resubmits used (max 2). */
  rejectedResubmitCount: number;
}
