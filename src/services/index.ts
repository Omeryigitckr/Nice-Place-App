export { getSupabase, isSupabaseConfigured, getSupabaseConfigError } from './supabase';
export {
  loadRecentSearches,
  addRecentSearch,
  removeRecentSearch,
} from './recentSearchesService';
export {
  loadAppSettings,
  saveAppSettings,
  resetAppSettings,
  clearLocalCache,
  subscribeAppSettings,
  getCachedAppSettings,
  DEFAULT_APP_SETTINGS,
  SETTINGS_KEYS,
} from './settingsService';
export type {
  AppSettings,
  ThemeMode,
  MapStylePreference,
  DistanceUnit,
  NotificationPreferences,
} from './settingsService';
export {
  getApprovedPlaces,
  getPlacesSortedByMostLiked,
  getPlacesSortedByNewest,
  getPlaceById,
  getPlaceDetail,
  getApprovedPlacesByCreator,
  getMyPlaces,
  getMyPlaceById,
  updateMyPlace,
  loadPlacesForMap,
  createPlace,
  normalizePlaceCategory,
} from './placesService';
export type {
  CreatePlaceInput,
  CreatePlaceResult,
  LoadPlacesResult,
  PlaceDetailResult,
  UpdatePlaceInput,
  UpdatePlaceResult,
} from './placesService';
export {
  getSavedPlaceIds,
  getSavedPlaces,
  savePlace,
  unsavePlace,
  toggleSavedPlace,
} from './savedPlacesService';
export type { SavedPlaceResult } from './savedPlacesService';
export {
  getLikedPlaceIds,
  getPlaceLikeCount,
  getLikesReceivedForProfile,
  likePlace,
  unlikePlace,
  togglePlaceLike,
} from './likesService';
export type { LikeResult } from './likesService';
export {
  getPlaceEngagementForPlaces,
  enrichPlacesWithEngagement,
} from './placeEngagementService';
export type { PlaceEngagement } from './placeEngagementService';
export { getProfileStats, getRecentSavedPlaces, getPublicProfile, getPublicProfileStats, updateProfile } from './profileService';
export type { ProfileStats, UpdateProfileInput, UpdateProfileResult } from './profileService';
export { uploadPlaceCoverPhoto, PLACE_PHOTOS_BUCKET } from './placePhotoService';
export {
  getPendingPlaces,
  getRejectedPlaces,
  approvePlace,
  rejectPlace,
  restoreRejectedPlace,
  softDeletePlace,
  getPendingPlaceUpdateRequests,
  getRejectedPlaceUpdateRequests,
  getPlaceUpdateRequestById,
  getPlaceForAdminReview,
  approvePlaceUpdateRequest,
  rejectPlaceUpdateRequest,
  restoreRejectedPlaceUpdateRequest,
} from './adminService';
export type { AdminActionResult } from './adminService';
export {
  fetchCurrentUserAdminStatus,
  assertAdminAccess,
  readIsAdminFlag,
} from './adminAccess';
export type { AdminAccessStatus } from './adminAccess';
export type { UploadPlaceCoverPhotoInput, UploadPlaceCoverPhotoResult } from './placePhotoService';
export { uploadProfileAvatar, PROFILE_AVATARS_BUCKET } from './avatarService';
export { deleteUserAccount } from './accountDeletionService';
export type { DeleteAccountInput, DeleteAccountResult } from './accountDeletionService';
export {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  notificationStatusLabel,
} from './notificationSettingsService';
export type { NotificationPermissionStatus } from './notificationSettingsService';
export type { UploadProfileAvatarInput, UploadProfileAvatarResult } from './avatarService';
export {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentSession,
  getProfileForUser,
  getOrCreateProfileForUser,
  resolveCurrentUserProfile,
  resolveCurrentUserProfileId,
  fetchProfileIdByAuthUserId,
  requestPasswordReset,
  requestEmailChange,
  updatePassword,
  changePasswordWithReauth,
} from './authService';
export {
  isAuthCallbackUrl,
  processAuthCallbackUrl,
  AUTH_CALLBACK_REDIRECT,
} from './authCallbackService';
export type { AuthCallbackFlow, AuthCallbackResult } from './authCallbackService';
export type { SignOutOptions } from './authService';
export {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
} from './socialAuthService';
