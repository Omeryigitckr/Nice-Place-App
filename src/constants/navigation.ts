export const SAVED_ROUTES = {
  SAVED_HOME: 'SavedHome',
  ALL_SAVED_PLACES: 'AllSavedPlaces',
  COLLECTION_DETAIL: 'CollectionDetail',
} as const;

export const TAB_ROUTES = {
  EXPLORE: 'Explore',
  SAVED: 'Saved',
  ADD_PLACE: 'AddPlace',
  PROFILE: 'Profile',
} as const;

export const ROOT_ROUTES = {
  SPLASH: 'Splash',
  ONBOARDING: 'Onboarding',
  AUTH: 'Auth',
  LOCATION_PERMISSION: 'LocationPermission',
  NOTIFICATION_PERMISSION: 'NotificationPermission',
  MAIN: 'Main',
  PLACE_DETAIL: 'PlaceDetail',
  ADD_PLACE: 'AddPlace',
} as const;

export const AUTH_ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  AUTH_CALLBACK: 'AuthCallback',
} as const;

export const MAP_ROUTES = {
  MAP_HOME: 'MapHome',
  PLACE_DETAIL: 'PlaceDetail',
  ADD_PLACE: 'AddPlace',
  EDIT_PLACE: 'EditPlace',
  PICK_LOCATION: 'PickLocation',
  PUBLIC_PROFILE: 'PublicProfile',
  NOTIFICATIONS: 'Notifications',
} as const;

export const PROFILE_ROUTES = {
  PROFILE_HOME: 'ProfileHome',
  SETTINGS: 'Settings',
  SETTINGS_ACCOUNT: 'SettingsAccount',
  CHANGE_PASSWORD: 'ChangePassword',
  CHANGE_EMAIL: 'ChangeEmail',
  SETTINGS_APPEARANCE: 'SettingsAppearance',
  SETTINGS_LANGUAGE: 'SettingsLanguage',
  SETTINGS_NOTIFICATIONS: 'SettingsNotifications',
  SETTINGS_PRIVACY_LOCATION: 'SettingsPrivacyLocation',
  SETTINGS_ABOUT: 'SettingsAbout',
  ADMIN_PANEL: 'AdminPanel',
  ADMIN_NOTIFICATION_BROADCAST: 'AdminNotificationBroadcast',
  ADMIN_REPORTED_PROFILES: 'AdminReportedProfiles',
  ADMIN_REPORTED_PROFILE_DETAIL: 'AdminReportedProfileDetail',
  ADMIN_PLACE_DETAIL: 'AdminPlaceDetail',
  ADMIN_UPDATE_REQUEST: 'AdminUpdateRequest',
} as const;
