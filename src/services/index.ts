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
  getMyCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionPlaces,
  addPlaceToCollection,
  removePlaceFromCollection,
  getCollectionsForPlace,
  togglePlaceInCollection,
  removePlaceFromAllCollections,
  COLLECTION_NAME_MAX_LENGTH,
  COLLECTION_DESCRIPTION_MAX_LENGTH,
} from './collectionsService';
export type {
  CollectionActionResult,
  CollectionMutationResult,
  CollectionPlacesResult,
} from './collectionsService';
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
export {
  uploadPlaceCoverPhoto,
  uploadPlacePhotos,
  getPlacePhotos,
  getPlacePhotoUrls,
  getCoverPhoto,
  syncPlacePhotos,
  normalizePlacePhotoUrls,
  MIN_PLACE_PHOTOS,
  MAX_PLACE_PHOTOS,
  PLACE_PHOTOS_BUCKET,
} from './placePhotoService';
export {
  fetchPlaceCategoriesByPlaceIds,
  fetchPlaceCategoryKeys,
  insertPlaceCategories,
  syncPlaceCategories,
} from './placeCategoryService';
export type {
  InsertPlaceCategoriesResult,
  SyncPlaceCategoriesInput,
  SyncPlaceCategoriesResult,
} from './placeCategoryService';
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
export type {
  UploadPlaceCoverPhotoInput,
  UploadPlaceCoverPhotoResult,
  UploadPlacePhotosInput,
  UploadPlacePhotosResult,
  PlacePhotoRecord,
} from './placePhotoService';
export { uploadProfileAvatar, removeProfileAvatar, PROFILE_AVATARS_BUCKET } from './avatarService';
export type {
  UploadProfileAvatarInput,
  UploadProfileAvatarResult,
  RemoveProfileAvatarInput,
  RemoveProfileAvatarResult,
} from './avatarService';
export { deleteUserAccount } from './accountDeletionService';
export type { DeleteAccountInput, DeleteAccountResult } from './accountDeletionService';
export {
  reportProfile,
  getMyModerationState,
  completeUsernameReset,
  adminListReportedProfiles,
  adminGetReportedProfileDetail,
  adminModerateProfile,
  adminDeleteUserAccount,
  isSuspensionActive,
} from './profileModerationService';
export type { ReportProfileResult } from './profileModerationService';
export {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  notificationStatusLabel,
  registerForPush,
  savePushToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendPushIfEnabled,
  broadcastNotification,
  notifyPlaceLiked,
  syncBadgeCount,
} from './notificationService';
export type {
  NotificationPermissionStatus,
  NotificationActionResult,
  DispatchNotificationInput,
  BroadcastNotificationInput,
} from './notificationService';
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
