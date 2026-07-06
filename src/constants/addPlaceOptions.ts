import { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';

export const ADD_PLACE_CATEGORIES = [
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'beach', label: 'Beach' },
  { value: 'forest', label: 'Forest' },
  { value: 'trail', label: 'Trail' },
  { value: 'camping', label: 'Camping' },
  { value: 'picnic', label: 'Picnic Area' },
  { value: 'historical', label: 'Historical Place' },
  { value: 'sunset', label: 'Sunset Spot' },
  { value: 'hidden_gem', label: 'Hidden Gem' },
  { value: 'other', label: 'Other' },
] as const;

export type AddPlaceCategoryValue = (typeof ADD_PLACE_CATEGORIES)[number]['value'];

export const ADD_PLACE_CATEGORY_VALUES: AddPlaceCategoryValue[] = ADD_PLACE_CATEGORIES.map(
  (item) => item.value,
);

export const BEST_TIME_OPTIONS = [
  'Anytime',
  'Morning',
  'Afternoon',
  'Sunset',
  'Night',
] as const;

export type BestTimeOption = (typeof BEST_TIME_OPTIONS)[number];

export const ACCESS_TYPE_OPTIONS: { value: DbAccessType; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'car', label: 'Car' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'unknown', label: 'Unknown' },
];

export const DIFFICULTY_OPTIONS: { value: DbDifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'unknown', label: 'Unknown' },
];

export const CROWD_LEVEL_OPTIONS: { value: DbCrowdLevel; label: string }[] = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'normal', label: 'Normal' },
  { value: 'crowded', label: 'Crowded' },
  { value: 'unknown', label: 'Unknown' },
];

export const FACILITY_TOGGLES = [
  { key: 'isPetFriendly', label: 'Pet friendly' },
  { key: 'isChildFriendly', label: 'Child friendly' },
  { key: 'isCarAccessible', label: 'Car accessible' },
  { key: 'isCampAllowed', label: 'Camping allowed' },
  { key: 'isPicnicSuitable', label: 'Picnic suitable' },
] as const;

export type FacilityToggleKey = (typeof FACILITY_TOGGLES)[number]['key'];
