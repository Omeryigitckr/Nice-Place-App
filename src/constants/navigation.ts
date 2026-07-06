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
} as const;

export const PROFILE_ROUTES = {
  PROFILE_HOME: 'ProfileHome',
  SETTINGS: 'Settings',
  SETTINGS_ACCOUNT: 'SettingsAccount',
  CHANGE_PASSWORD: 'ChangePassword',
  CHANGE_EMAIL: 'ChangeEmail',
  SETTINGS_APPEARANCE: 'SettingsAppearance',
  SETTINGS_NOTIFICATIONS: 'SettingsNotifications',
  SETTINGS_PRIVACY_LOCATION: 'SettingsPrivacyLocation',
  SETTINGS_ABOUT: 'SettingsAbout',
  ADMIN_PANEL: 'AdminPanel',
  ADMIN_PLACE_DETAIL: 'AdminPlaceDetail',
  ADMIN_UPDATE_REQUEST: 'AdminUpdateRequest',
} as const;
