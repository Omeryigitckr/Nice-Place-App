/**
 * Survives Add Place unmount while the map picker is open.
 * Saved before opening the picker; restored on return (confirm or cancel).
 */

import type { PlaceCategoryKey } from '../constants/placeCategories';
import type { BestTimeOption } from '../constants';
import type { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';

export type AddPlaceFormDraft = {
  /** True while map picker is open / until draft is restored. */
  awaitingPicker: boolean;
  title: string;
  selectedCategories: PlaceCategoryKey[];
  description: string;
  latitude: number;
  longitude: number;
  locationReady: boolean;
  locationLabel: string;
  userPickedLocation: boolean;
  bestTime: BestTimeOption;
  accessType: DbAccessType;
  difficultyLevel: DbDifficultyLevel;
  crowdLevel: DbCrowdLevel;
  facilities: {
    isPetFriendly: boolean;
    isChildFriendly: boolean;
    isCarAccessible: boolean;
    isCampAllowed: boolean;
    isPicnicSuitable: boolean;
  };
  safetyNote: string;
  /** Local URIs selected before submit (supports map-picker draft restore). */
  selectedPhotoUris: string[];
};

let draft: AddPlaceFormDraft | null = null;

export function saveAddPlaceFormDraft(next: AddPlaceFormDraft): void {
  draft = { ...next, facilities: { ...next.facilities } };
}

export function peekAddPlaceFormDraft(): AddPlaceFormDraft | null {
  return draft;
}

/** Restore once after picker trip (confirm or cancel). */
export function consumeAddPlaceFormDraft(): AddPlaceFormDraft | null {
  const current = draft;
  if (!current?.awaitingPicker) {
    return null;
  }
  draft = {
    ...current,
    facilities: { ...current.facilities },
    awaitingPicker: false,
  };
  return current;
}

export function clearAddPlaceFormDraft(): void {
  draft = null;
}
