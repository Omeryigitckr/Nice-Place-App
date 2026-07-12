import { Place } from '../types/place';
import { DISTANCE_UNAVAILABLE } from '../utils/distance';
import { normalizePlaceCategories } from './placeCategories';

type MockPlaceInput = Omit<
  Place,
  | 'distance'
  | 'accessTypeSlug'
  | 'difficultySlug'
  | 'crowdLevelSlug'
  | 'isPetFriendly'
  | 'isChildFriendly'
  | 'isCarAccessible'
  | 'isCampAllowed'
  | 'isPicnicSuitable'
  | 'safetyNote'
  | 'categories'
> & {
  categories?: string[];
  accessTypeSlug?: string;
  difficultySlug?: string;
  crowdLevelSlug?: string;
  isPetFriendly?: boolean;
  isChildFriendly?: boolean;
  isCarAccessible?: boolean;
  isCampAllowed?: boolean;
  isPicnicSuitable?: boolean;
  safetyNote?: string | null;
};

function mockPlace(input: MockPlaceInput): Place {
  const categories = input.categories?.length
    ? normalizePlaceCategories(input.categories)
    : normalizePlaceCategories([input.categorySlug]);
  return {
    ...input,
    categories,
    distance: DISTANCE_UNAVAILABLE,
    accessTypeSlug: input.accessTypeSlug ?? 'walking',
    difficultySlug: input.difficultySlug ?? 'easy',
    crowdLevelSlug: input.crowdLevelSlug ?? 'normal',
    isPetFriendly: input.isPetFriendly ?? false,
    isChildFriendly: input.isChildFriendly ?? false,
    isCarAccessible: input.isCarAccessible ?? false,
    isCampAllowed: input.isCampAllowed ?? false,
    isPicnicSuitable: input.isPicnicSuitable ?? false,
    safetyNote: input.safetyNote ?? null,
  };
}

export const MOCK_PLACES: Place[] = [
  mockPlace({
    id: 'sunset-cliff',
    title: 'Sunset Cliff',
    category: 'Sunset Point',
    categorySlug: 'sunset',
    description:
      'A quiet cliff edge with panoramic west-facing views. Perfect for golden hour photography and a peaceful end to the day.',
    image:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
    bestTime: 'Sunset',
    accessType: 'walking',
    difficulty: 'easy',
    crowdLevel: 'moderate',
    likeCount: 284,
    saveCount: 156,
    latitude: 41.0082,
    longitude: 28.9784,
    tags: ['sunset', 'viewpoint', 'photography'],
    mapPosition: { x: 0.72, y: 0.28 },
    createdAt: '2026-03-01',
  }),
  mockPlace({
    id: 'hidden-lake-bench',
    title: 'Hidden Lake Bench',
    category: 'Hidden Gem',
    categorySlug: 'hidden_gem',
    description:
      'A secluded wooden bench beside a small lake, surrounded by trees. Ideal for reading, reflection, or a calm afternoon.',
    image:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop',
    bestTime: 'Morning',
    accessType: 'walking',
    difficulty: 'easy',
    crowdLevel: 'quiet',
    crowdLevelSlug: 'quiet',
    isPicnicSuitable: true,
    likeCount: 198,
    saveCount: 124,
    latitude: 41.012,
    longitude: 28.965,
    tags: ['bench', 'lake', 'quiet'],
    mapPosition: { x: 0.35, y: 0.55 },
    createdAt: '2026-02-15',
  }),
  mockPlace({
    id: 'forest-viewpoint',
    title: 'Forest Viewpoint',
    category: 'Viewpoint',
    categorySlug: 'viewpoint',
    description:
      'A raised lookout above the treeline with sweeping valley views. A short uphill walk rewards you with fresh air and silence.',
    image:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80&auto=format&fit=crop',
    bestTime: 'Afternoon',
    accessType: 'walking',
    difficulty: 'moderate',
    difficultySlug: 'medium',
    crowdLevel: 'quiet',
    crowdLevelSlug: 'quiet',
    likeCount: 342,
    saveCount: 201,
    latitude: 41.02,
    longitude: 28.99,
    tags: ['forest', 'viewpoint', 'hiking'],
    mapPosition: { x: 0.58, y: 0.42 },
    createdAt: '2026-01-20',
  }),
  mockPlace({
    id: 'quiet-riverside',
    title: 'Quiet Riverside',
    category: 'Picnic Area',
    categorySlug: 'picnic',
    description:
      'A gentle stretch of riverbank with flat stones and shade. Great for a picnic or dipping your feet on warm days.',
    image:
      'https://images.unsplash.com/photo-1439068791047-4c2c8e3c5e3f?w=800&q=80&auto=format&fit=crop',
    bestTime: 'Afternoon',
    accessType: 'walking',
    difficulty: 'easy',
    crowdLevel: 'moderate',
    isPicnicSuitable: true,
    isChildFriendly: true,
    likeCount: 167,
    saveCount: 89,
    latitude: 41.005,
    longitude: 28.972,
    tags: ['river', 'picnic', 'relax'],
    mapPosition: { x: 0.22, y: 0.68 },
    createdAt: '2026-03-10',
  }),
  mockPlace({
    id: 'city-lights-hill',
    title: 'City Lights Hill',
    category: 'Viewpoint',
    categorySlug: 'viewpoint',
    description:
      'An elevated spot overlooking the city skyline. Best visited after dusk when lights begin to sparkle across the horizon.',
    image:
      'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80&auto=format&fit=crop',
    bestTime: 'Night',
    accessType: 'driving',
    accessTypeSlug: 'car',
    difficulty: 'easy',
    crowdLevel: 'moderate',
    isCarAccessible: true,
    likeCount: 421,
    saveCount: 278,
    latitude: 41.03,
    longitude: 28.96,
    tags: ['city', 'night', 'viewpoint'],
    mapPosition: { x: 0.82, y: 0.62 },
    createdAt: '2026-02-28',
  }),
  mockPlace({
    id: 'pine-trail-start',
    title: 'Pine Trail Start',
    category: 'Trail',
    categorySlug: 'trail',
    description:
      'The starting point of a well-marked pine forest trail. Shaded paths, bird calls, and a refreshing escape from the city.',
    image:
      'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=800&q=80&auto=format&fit=crop',
    bestTime: 'Morning',
    accessType: 'driving',
    accessTypeSlug: 'car',
    difficulty: 'moderate',
    difficultySlug: 'medium',
    crowdLevel: 'quiet',
    crowdLevelSlug: 'quiet',
    isCarAccessible: true,
    likeCount: 256,
    saveCount: 143,
    latitude: 41.035,
    longitude: 29.01,
    tags: ['trail', 'forest', 'hiking'],
    mapPosition: { x: 0.48, y: 0.22 },
    createdAt: '2026-03-05',
  }),
];
