import { DbAccessType, DbCrowdLevel, DbDifficultyLevel } from '../types/database';

/**
 * Insert payload for public.place_update_requests.
 * Column names must match the Supabase table exactly (snake_case).
 * Do not use `name` (use `title`). Do not use `address` (places uses `address_text`).
 *
 * Tags are not stored here — the app derives tags from category, no place_tags table.
 */
export const PLACE_UPDATE_REQUEST_INSERT_FIELDS = [
  'place_id',
  'user_id',
  'title',
  'description',
  'category',
  'latitude',
  'longitude',
  'access_type',
  'best_time',
  'difficulty_level',
  'crowd_level',
  'is_pet_friendly',
  'is_child_friendly',
  'is_car_accessible',
  'is_camp_allowed',
  'is_picnic_suitable',
  'safety_note',
  'cover_photo_url',
  'status',
] as const;

export type PlaceUpdateRequestInsertField = (typeof PLACE_UPDATE_REQUEST_INSERT_FIELDS)[number];

/** Row payload for supabase.from('place_update_requests').insert(...) */
export interface PlaceUpdateRequestInsert {
  place_id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  access_type: DbAccessType;
  best_time: string;
  difficulty_level: DbDifficultyLevel;
  crowd_level: DbCrowdLevel;
  is_pet_friendly: boolean;
  is_child_friendly: boolean;
  is_car_accessible: boolean;
  is_camp_allowed: boolean;
  is_picnic_suitable: boolean;
  safety_note: string | null;
  cover_photo_url: string | null;
  status: 'pending';
}
