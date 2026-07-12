import { i18n } from '../i18n/instance';
import { Place } from '../types/place';

export const MIN_PLACE_CATEGORIES = 1;
export const MAX_PLACE_CATEGORIES = 4;

export const PLACE_CATEGORY_FALLBACK_KEY = 'hidden_gem';
export const PLACE_CATEGORY_FALLBACK_LABEL = 'Discovery';

export interface PlaceCategoryMeta {
  key: PlaceCategoryKey;
  label: string;
  emoji: string;
  groupId: PlaceCategoryGroupId;
}

export type PlaceCategoryGroupId =
  | 'nature'
  | 'scenic'
  | 'adventure'
  | 'discovery'
  | 'seasonal';

export type PlaceCategoryKey =
  | 'waterfall'
  | 'lake'
  | 'river'
  | 'forest'
  | 'mountain'
  | 'canyon'
  | 'cave'
  | 'beach'
  | 'viewpoint'
  | 'sunset_spot'
  | 'sunrise_spot'
  | 'panorama'
  | 'photography_spot'
  | 'camping'
  | 'hiking'
  | 'picnic'
  | 'off_road'
  | 'hidden_gem'
  | 'historical_site'
  | 'ancient_ruins'
  | 'landmark'
  | 'bridge'
  | 'snow_area'
  | 'flower_field'
  | 'natural_wonder';

export interface PlaceCategoryGroup {
  id: PlaceCategoryGroupId;
  label: string;
  categories: PlaceCategoryMeta[];
}

const CATEGORY_DEFS: PlaceCategoryMeta[] = [
  { key: 'waterfall', label: 'Waterfall', emoji: '🏞️', groupId: 'nature' },
  { key: 'lake', label: 'Lake', emoji: '💧', groupId: 'nature' },
  { key: 'river', label: 'River', emoji: '🌊', groupId: 'nature' },
  { key: 'forest', label: 'Forest', emoji: '🌳', groupId: 'nature' },
  { key: 'mountain', label: 'Mountain', emoji: '🏔️', groupId: 'nature' },
  { key: 'canyon', label: 'Canyon', emoji: '🪨', groupId: 'nature' },
  { key: 'cave', label: 'Cave', emoji: '🕳️', groupId: 'nature' },
  { key: 'beach', label: 'Beach', emoji: '🏖️', groupId: 'nature' },
  { key: 'viewpoint', label: 'Viewpoint', emoji: '🌄', groupId: 'scenic' },
  { key: 'sunset_spot', label: 'Sunset Spot', emoji: '🌅', groupId: 'scenic' },
  { key: 'sunrise_spot', label: 'Sunrise Spot', emoji: '🌇', groupId: 'scenic' },
  { key: 'panorama', label: 'Panorama', emoji: '🖼️', groupId: 'scenic' },
  { key: 'photography_spot', label: 'Photography Spot', emoji: '📸', groupId: 'scenic' },
  { key: 'camping', label: 'Camping', emoji: '🏕️', groupId: 'adventure' },
  { key: 'hiking', label: 'Hiking', emoji: '🥾', groupId: 'adventure' },
  { key: 'picnic', label: 'Picnic', emoji: '🧺', groupId: 'adventure' },
  { key: 'off_road', label: 'Off-road', emoji: '🚙', groupId: 'adventure' },
  { key: 'hidden_gem', label: 'Hidden Gem', emoji: '💎', groupId: 'discovery' },
  { key: 'historical_site', label: 'Historical Site', emoji: '🏛️', groupId: 'discovery' },
  { key: 'ancient_ruins', label: 'Ancient Ruins', emoji: '🏺', groupId: 'discovery' },
  { key: 'landmark', label: 'Landmark', emoji: '📍', groupId: 'discovery' },
  { key: 'bridge', label: 'Bridge', emoji: '🌉', groupId: 'discovery' },
  { key: 'snow_area', label: 'Snow Area', emoji: '❄️', groupId: 'seasonal' },
  { key: 'flower_field', label: 'Flower Field', emoji: '🌸', groupId: 'seasonal' },
  { key: 'natural_wonder', label: 'Natural Wonder', emoji: '✨', groupId: 'seasonal' },
];

const CATEGORY_BY_KEY = new Map<string, PlaceCategoryMeta>(
  CATEGORY_DEFS.map((item) => [item.key, item]),
);

/** Maps legacy single-category slugs to the new taxonomy. */
export const LEGACY_CATEGORY_MAP: Record<string, PlaceCategoryKey> = {
  trail: 'hiking',
  camp: 'camping',
  historical: 'historical_site',
  sunset: 'sunset_spot',
  sunrise: 'sunrise_spot',
  photo_spot: 'photography_spot',
  other: 'hidden_gem',
  quiet_spot: 'hidden_gem',
  bench: 'landmark',
  waterside: 'lake',
  city_view: 'viewpoint',
  stargazing: 'natural_wonder',
  hiking_start: 'hiking',
};

export const PLACE_CATEGORIES: PlaceCategoryMeta[] = CATEGORY_DEFS;

export const PLACE_CATEGORY_KEYS: PlaceCategoryKey[] = CATEGORY_DEFS.map((item) => item.key);

export const PLACE_CATEGORY_GROUPS: PlaceCategoryGroup[] = [
  {
    id: 'nature',
    label: 'Nature',
    categories: CATEGORY_DEFS.filter((item) => item.groupId === 'nature'),
  },
  {
    id: 'scenic',
    label: 'Scenic',
    categories: CATEGORY_DEFS.filter((item) => item.groupId === 'scenic'),
  },
  {
    id: 'adventure',
    label: 'Adventure',
    categories: CATEGORY_DEFS.filter((item) => item.groupId === 'adventure'),
  },
  {
    id: 'discovery',
    label: 'Discovery',
    categories: CATEGORY_DEFS.filter((item) => item.groupId === 'discovery'),
  },
  {
    id: 'seasonal',
    label: 'Seasonal / Special',
    categories: CATEGORY_DEFS.filter((item) => item.groupId === 'seasonal'),
  },
];

function slugifyCategoryKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function mapLegacyCategoryKey(key: string): PlaceCategoryKey | null {
  const slug = slugifyCategoryKey(key);
  if (CATEGORY_BY_KEY.has(slug)) {
    return slug as PlaceCategoryKey;
  }
  if (LEGACY_CATEGORY_MAP[slug]) {
    return LEGACY_CATEGORY_MAP[slug];
  }
  return null;
}

export function getPlaceCategoryMeta(key: string): PlaceCategoryMeta | null {
  const mapped = mapLegacyCategoryKey(key);
  if (!mapped) {
    return null;
  }
  return CATEGORY_BY_KEY.get(mapped) ?? null;
}

const CATEGORY_LABEL_KEYS: Record<PlaceCategoryKey, `categories.${PlaceCategoryKey}`> = {
  waterfall: 'categories.waterfall',
  lake: 'categories.lake',
  river: 'categories.river',
  forest: 'categories.forest',
  mountain: 'categories.mountain',
  canyon: 'categories.canyon',
  cave: 'categories.cave',
  beach: 'categories.beach',
  viewpoint: 'categories.viewpoint',
  sunset_spot: 'categories.sunset_spot',
  sunrise_spot: 'categories.sunrise_spot',
  panorama: 'categories.panorama',
  photography_spot: 'categories.photography_spot',
  camping: 'categories.camping',
  hiking: 'categories.hiking',
  picnic: 'categories.picnic',
  off_road: 'categories.off_road',
  hidden_gem: 'categories.hidden_gem',
  historical_site: 'categories.historical_site',
  ancient_ruins: 'categories.ancient_ruins',
  landmark: 'categories.landmark',
  bridge: 'categories.bridge',
  snow_area: 'categories.snow_area',
  flower_field: 'categories.flower_field',
  natural_wonder: 'categories.natural_wonder',
};

const CATEGORY_GROUP_LABEL_KEYS: Record<
  PlaceCategoryGroupId,
  | 'categories.groups.nature'
  | 'categories.groups.scenic'
  | 'categories.groups.adventure'
  | 'categories.groups.discovery'
  | 'categories.groups.seasonal'
> = {
  nature: 'categories.groups.nature',
  scenic: 'categories.groups.scenic',
  adventure: 'categories.groups.adventure',
  discovery: 'categories.groups.discovery',
  seasonal: 'categories.groups.seasonal',
};

export function getPlaceCategoryLabel(key: string): string {
  const meta = getPlaceCategoryMeta(key);
  if (!meta) {
    return formatUnknownCategoryLabel(key);
  }
  return i18n.t(CATEGORY_LABEL_KEYS[meta.key], { defaultValue: meta.label });
}

export function getPlaceCategoryGroupLabel(groupId: PlaceCategoryGroupId): string {
  return i18n.t(CATEGORY_GROUP_LABEL_KEYS[groupId]);
}

function formatUnknownCategoryLabel(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return i18n.t('categories.fallback');
  }
  return trimmed
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Normalize, dedupe, and cap category keys (preserves input order). */
export function normalizePlaceCategories(input: string | string[] | null | undefined): PlaceCategoryKey[] {
  const raw = Array.isArray(input) ? input : input ? [input] : [];
  const seen = new Set<string>();
  const normalized: PlaceCategoryKey[] = [];

  for (const value of raw) {
    const mapped = mapLegacyCategoryKey(value);
    if (!mapped || seen.has(mapped)) {
      continue;
    }
    seen.add(mapped);
    normalized.push(mapped);
    if (normalized.length >= MAX_PLACE_CATEGORIES) {
      break;
    }
  }

  return normalized;
}

export function getPrimaryPlaceCategory(
  place: Pick<Place, 'categories' | 'categorySlug'>,
): PlaceCategoryKey {
  const fromList = normalizePlaceCategories(place.categories);
  if (fromList.length > 0) {
    return fromList[0];
  }
  const legacy = mapLegacyCategoryKey(place.categorySlug);
  return legacy ?? PLACE_CATEGORY_FALLBACK_KEY;
}

export function formatCategoryDisplayLabels(keys: string[]): string[] {
  return normalizePlaceCategories(keys).map((key) => getPlaceCategoryLabel(key));
}

export function formatPrimaryCategoryLabel(
  place: Pick<Place, 'categories' | 'categorySlug' | 'category'>,
): string {
  const primary = getPrimaryPlaceCategory(place);
  const meta = getPlaceCategoryMeta(primary);
  if (meta) {
    return getPlaceCategoryLabel(meta.key);
  }
  return place.category?.trim() || i18n.t('categories.fallback');
}

export function deriveTagsFromCategories(keys: string[]): string[] {
  const tags = new Set<string>();
  for (const key of normalizePlaceCategories(keys)) {
    for (const part of key.split('_')) {
      if (part.length > 1) {
        tags.add(part);
      }
    }
  }
  return Array.from(tags);
}

export function placeHasAnyCategory(place: Pick<Place, 'categories' | 'categorySlug'>, filterKeys: string[]): boolean {
  if (filterKeys.length === 0) {
    return true;
  }
  const placeKeys = resolvePlaceCategoryKeys(place);
  return filterKeys.some((key) => {
    const normalized = mapLegacyCategoryKey(key);
    return normalized != null && placeKeys.includes(normalized);
  });
}

export function resolvePlaceCategoryKeys(
  place: Pick<Place, 'categories' | 'categorySlug'>,
): PlaceCategoryKey[] {
  const fromList = normalizePlaceCategories(place.categories);
  if (fromList.length > 0) {
    return fromList;
  }
  const legacy = mapLegacyCategoryKey(place.categorySlug);
  return legacy ? [legacy] : [PLACE_CATEGORY_FALLBACK_KEY];
}

export function categoryKeyListsEqual(a: string[], b: string[]): boolean {
  const left = normalizePlaceCategories(a).slice().sort();
  const right = normalizePlaceCategories(b).slice().sort();
  if (left.length !== right.length) {
    return false;
  }
  return left.every((key, index) => key === right[index]);
}

/** @deprecated Use PLACE_CATEGORIES — kept for filter imports during migration. */
export const ADD_PLACE_CATEGORIES = PLACE_CATEGORIES.map(({ key, label }) => ({
  value: key,
  label,
}));

export type AddPlaceCategoryValue = PlaceCategoryKey;

export const ADD_PLACE_CATEGORY_VALUES: PlaceCategoryKey[] = PLACE_CATEGORY_KEYS;
