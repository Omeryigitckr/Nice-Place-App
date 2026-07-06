import { ADD_PLACE_CATEGORIES, BestTimeOption } from '../constants/addPlaceOptions';
import { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';
import { Place, QuickFilter } from '../types/place';

import { Coordinates, getPlaceDistanceKm } from './distance';

export interface ExploreFilters {
  categories: string[];
  bestTimes: BestTimeOption[];
  accessTypes: DbAccessType[];
  difficultyLevels: DbDifficultyLevel[];
  crowdLevels: DbCrowdLevel[];
  requirePetFriendly: boolean;
  requireChildFriendly: boolean;
  requireCarAccessible: boolean;
  requireCampAllowed: boolean;
  requirePicnicSuitable: boolean;
}

export const EMPTY_EXPLORE_FILTERS: ExploreFilters = {
  categories: [],
  bestTimes: [],
  accessTypes: [],
  difficultyLevels: [],
  crowdLevels: [],
  requirePetFriendly: false,
  requireChildFriendly: false,
  requireCarAccessible: false,
  requireCampAllowed: false,
  requirePicnicSuitable: false,
};

export function matchesSearch(place: Place, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    place.title.toLowerCase().includes(normalized) ||
    place.description.toLowerCase().includes(normalized) ||
    place.category.toLowerCase().includes(normalized) ||
    place.categorySlug.toLowerCase().includes(normalized) ||
    place.tags.some((tag) => tag.toLowerCase().includes(normalized))
  );
}

export function matchesExploreFilters(place: Place, filters: ExploreFilters): boolean {
  if (filters.categories.length > 0 && !filters.categories.includes(place.categorySlug)) {
    return false;
  }

  if (filters.bestTimes.length > 0 && !filters.bestTimes.includes(place.bestTime as BestTimeOption)) {
    return false;
  }

  if (
    filters.accessTypes.length > 0 &&
    !filters.accessTypes.includes(place.accessTypeSlug as DbAccessType)
  ) {
    return false;
  }

  if (
    filters.difficultyLevels.length > 0 &&
    !filters.difficultyLevels.includes(place.difficultySlug as DbDifficultyLevel)
  ) {
    return false;
  }

  if (
    filters.crowdLevels.length > 0 &&
    !filters.crowdLevels.includes(place.crowdLevelSlug as DbCrowdLevel)
  ) {
    return false;
  }

  if (filters.requirePetFriendly && !place.isPetFriendly) {
    return false;
  }

  if (filters.requireChildFriendly && !place.isChildFriendly) {
    return false;
  }

  if (filters.requireCarAccessible && !place.isCarAccessible) {
    return false;
  }

  if (filters.requireCampAllowed && !place.isCampAllowed) {
    return false;
  }

  if (filters.requirePicnicSuitable && !place.isPicnicSuitable) {
    return false;
  }

  return true;
}

export function applyQuickFilter(places: Place[], quickFilter: QuickFilter): Place[] {
  switch (quickFilter) {
    case 'sunset':
      return places.filter((place) => place.categorySlug === 'sunset');
    case 'hidden_gems':
      return places.filter((place) => place.categorySlug === 'hidden_gem');
    case 'camping':
      return places.filter((place) => place.categorySlug === 'camping');
    case 'nearby':
    default:
      return places;
  }
}

export function filterPlaces(
  places: Place[],
  options: {
    search?: string;
    filters?: ExploreFilters;
    quickFilter?: QuickFilter;
  },
): Place[] {
  const filters = options.filters ?? EMPTY_EXPLORE_FILTERS;
  const search = options.search ?? '';
  const quickFilter = options.quickFilter ?? 'nearby';

  return applyQuickFilter(places, quickFilter).filter(
    (place) => matchesSearch(place, search) && matchesExploreFilters(place, filters),
  );
}

export function sortPlacesByDistance(
  places: Place[],
  userLocation: Coordinates | null | undefined,
): Place[] {
  if (!userLocation) {
    return places;
  }

  return [...places].sort((a, b) => {
    const aKm = getPlaceDistanceKm(userLocation, a) ?? Number.POSITIVE_INFINITY;
    const bKm = getPlaceDistanceKm(userLocation, b) ?? Number.POSITIVE_INFINITY;
    return aKm - bKm;
  });
}

export function countActiveExploreFilters(filters: ExploreFilters): number {
  let count =
    filters.categories.length +
    filters.bestTimes.length +
    filters.accessTypes.length +
    filters.difficultyLevels.length +
    filters.crowdLevels.length;

  if (filters.requirePetFriendly) count += 1;
  if (filters.requireChildFriendly) count += 1;
  if (filters.requireCarAccessible) count += 1;
  if (filters.requireCampAllowed) count += 1;
  if (filters.requirePicnicSuitable) count += 1;

  return count;
}

export const EXPLORE_CATEGORY_OPTIONS = ADD_PLACE_CATEGORIES;
