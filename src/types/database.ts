export type PlaceStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'deleted';

export type PlaceCategory =
  | 'viewpoint'
  | 'waterfall'
  | 'beach'
  | 'forest'
  | 'trail'
  | 'camping'
  | 'picnic'
  | 'historical'
  | 'sunset'
  | 'hidden_gem'
  | 'other'
  | 'sunrise'
  | 'quiet_spot'
  | 'bench'
  | 'waterside'
  | 'city_view'
  | 'photo_spot'
  | 'camp'
  | 'stargazing'
  | 'hiking_start';

export type DbAccessType =
  | 'car'
  | 'walking'
  | 'bicycle'
  | 'public_transport'
  | 'mixed'
  | 'unknown';

export type DbDifficultyLevel = 'easy' | 'medium' | 'hard' | 'unknown';

export type DbCrowdLevel = 'quiet' | 'normal' | 'crowded' | 'unknown';

export interface DbPlace {
  id: string;
  title: string;
  description: string;
  category: PlaceCategory | string;
  latitude: number;
  longitude: number;
  location_point?: unknown;
  address_text: string | null;
  created_by: string | null;
  status: PlaceStatus;
  verification_count: number;
  like_count: number;
  save_count: number;
  view_count: number;
  best_time: string | null;
  access_type: DbAccessType | string;
  difficulty_level: DbDifficultyLevel | string;
  crowd_level: DbCrowdLevel | string;
  is_pet_friendly: boolean;
  is_child_friendly: boolean;
  is_car_accessible: boolean;
  is_camp_allowed: boolean;
  is_picnic_suitable: boolean;
  safety_note: string | null;
  cover_photo_url?: string | null;
  /** Identical rejected-place resubmits (owner). Default 0. */
  rejected_resubmit_count?: number;
  /** Set when status becomes rejected; cleared on resubmit/approve. */
  rejected_at?: string | null;
  /** Set after Storage cleanup of rejected place photos. */
  rejected_photos_purged_at?: string | null;
  slug?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPlacePhoto {
  id: string;
  place_id: string;
  uploaded_by: string | null;
  image_url: string;
  storage_path: string | null;
  caption: string | null;
  is_cover: boolean;
  order_index?: number;
  status: string;
  created_at: string;
}

export interface DbPlaceCategory {
  id: string;
  place_id: string;
  category_key: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  auth_user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  avatar_storage_path?: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  trust_score: number;
  is_admin: boolean;
  is_banned: boolean;
  is_suspended?: boolean;
  suspended_until?: string | null;
  suspension_reason?: string | null;
  moderation_strikes?: number;
  username_reset_required?: boolean;
  /** Optional; some deployments may use role = 'admin' instead of is_admin. */
  role?: string | null;
}

export interface DbSavedPlace {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
}

export interface DbSavedCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSavedCollectionPlace {
  id: string;
  collection_id: string;
  place_id: string;
  created_at: string;
}

export interface DbPlaceLike {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
}

export type PlaceUpdateRequestStatus = 'pending' | 'approved' | 'rejected';

/** Matches public.place_update_requests columns. */
export interface DbPlaceUpdateRequest {
  id: string;
  place_id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  access_type: string | null;
  best_time: string | null;
  difficulty_level: string | null;
  crowd_level: string | null;
  is_pet_friendly: boolean | null;
  is_child_friendly: boolean | null;
  is_car_accessible: boolean | null;
  is_camp_allowed: boolean | null;
  is_picnic_suitable: boolean | null;
  safety_note: string | null;
  cover_photo_url: string | null;
  /** Ordered category keys submitted with the edit (max 4). */
  category_keys?: string[] | null;
  /** Ordered public image URLs submitted with an edit request (max 3). */
  photo_urls?: string[] | null;
  status: PlaceUpdateRequestStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}
