import { i18n } from '../i18n/instance';
import { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';

export {
  ADD_PLACE_CATEGORIES,
  ADD_PLACE_CATEGORY_VALUES,
  type AddPlaceCategoryValue,
} from './placeCategories';

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

const BEST_TIME_KEYS = {
  Anytime: 'options.bestTime.Anytime',
  Morning: 'options.bestTime.Morning',
  Afternoon: 'options.bestTime.Afternoon',
  Sunset: 'options.bestTime.Sunset',
  Night: 'options.bestTime.Night',
} as const;

const ACCESS_KEYS = {
  walking: 'options.access.walking',
  car: 'options.access.car',
  bicycle: 'options.access.bicycle',
  public_transport: 'options.access.public_transport',
  mixed: 'options.access.mixed',
  unknown: 'options.access.unknown',
} as const;

const DIFFICULTY_KEYS = {
  easy: 'options.difficulty.easy',
  medium: 'options.difficulty.medium',
  moderate: 'options.difficulty.moderate',
  hard: 'options.difficulty.hard',
  unknown: 'options.difficulty.unknown',
} as const;

const CROWD_KEYS = {
  quiet: 'options.crowd.quiet',
  normal: 'options.crowd.normal',
  crowded: 'options.crowd.crowded',
  unknown: 'options.crowd.unknown',
} as const;

const FACILITY_KEYS: Record<FacilityToggleKey, 'options.facilities.petFriendly' | 'options.facilities.childFriendly' | 'options.facilities.carAccessible' | 'options.facilities.campAllowed' | 'options.facilities.picnicSuitable'> = {
  isPetFriendly: 'options.facilities.petFriendly',
  isChildFriendly: 'options.facilities.childFriendly',
  isCarAccessible: 'options.facilities.carAccessible',
  isCampAllowed: 'options.facilities.campAllowed',
  isPicnicSuitable: 'options.facilities.picnicSuitable',
};

export function getBestTimeLabel(value: string): string {
  const key = BEST_TIME_KEYS[value as BestTimeOption];
  return key ? i18n.t(key) : value;
}

export function getAccessTypeLabel(value: DbAccessType | string): string {
  const normalized = value === 'driving' ? 'car' : value;
  const key = ACCESS_KEYS[normalized as keyof typeof ACCESS_KEYS];
  return i18n.t(key ?? ACCESS_KEYS.unknown);
}

export function getDifficultyLabel(value: DbDifficultyLevel | string): string {
  const normalized = value === 'moderate' ? 'moderate' : value;
  const key = DIFFICULTY_KEYS[normalized as keyof typeof DIFFICULTY_KEYS];
  return i18n.t(key ?? DIFFICULTY_KEYS.unknown);
}

export function getCrowdLevelLabel(value: DbCrowdLevel | string): string {
  const normalized =
    value === 'moderate' ? 'normal' : value === 'busy' ? 'crowded' : value;
  const key = CROWD_KEYS[normalized as keyof typeof CROWD_KEYS];
  return i18n.t(key ?? CROWD_KEYS.unknown);
}

export function getFacilityLabel(key: FacilityToggleKey): string {
  return i18n.t(FACILITY_KEYS[key]);
}
