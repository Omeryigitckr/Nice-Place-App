/** AsyncStorage keys for the offline cache layer. */

export const CACHE_KEYS = {
  placesList: '@nice_place/cache/places_list',
  mapPlaces: '@nice_place/cache/map_places',
  placeDetail: (placeId: string) => `@nice_place/cache/place_detail:${placeId}`,
  userProfile: (profileId: string) => `@nice_place/cache/user_profile:${profileId}`,
  userProfileByAuth: (authUserId: string) =>
    `@nice_place/cache/user_profile_auth:${authUserId}`,
  savedPlaces: (profileId: string) => `@nice_place/cache/saved_places:${profileId}`,
  savedIds: (profileId: string) => `@nice_place/cache/saved_ids:${profileId}`,
  likedIds: (profileId: string) => `@nice_place/cache/liked_ids:${profileId}`,
  myPlaces: (profileId: string) => `@nice_place/cache/my_places:${profileId}`,
} as const;

/** Freshness windows — expired entries may still be used offline. */
export const CACHE_TTL = {
  placesListMs: 30 * 60 * 1000,
  mapPlacesMs: 30 * 60 * 1000,
  placeDetailMs: 60 * 60 * 1000,
  userProfileMs: 24 * 60 * 60 * 1000,
  savedPlacesMs: 60 * 60 * 1000,
  engagementIdsMs: 24 * 60 * 60 * 1000,
  myPlacesMs: 30 * 60 * 1000,
} as const;
