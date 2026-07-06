import { NavigatorScreenParams } from '@react-navigation/native';

import { AUTH_ROUTES, MAP_ROUTES, PROFILE_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '../constants';

export type AuthStackParamList = {
  [AUTH_ROUTES.LOGIN]: undefined;
  [AUTH_ROUTES.REGISTER]: undefined;
  [AUTH_ROUTES.FORGOT_PASSWORD]: undefined;
  [AUTH_ROUTES.RESET_PASSWORD]: undefined;
  [AUTH_ROUTES.AUTH_CALLBACK]: undefined;
};

export type AddPlaceParams = {
  latitude?: number;
  longitude?: number;
  locationAdjusted?: boolean;
};

export type PickLocationParams = {
  latitude: number;
  longitude: number;
  returnTo?: typeof MAP_ROUTES.ADD_PLACE | typeof MAP_ROUTES.EDIT_PLACE;
  placeId?: string;
};

export type MapStackParamList = {
  [MAP_ROUTES.MAP_HOME]: undefined;
  [MAP_ROUTES.PLACE_DETAIL]: { placeId?: string } | undefined;
  [MAP_ROUTES.EDIT_PLACE]: {
    placeId: string;
    latitude?: number;
    longitude?: number;
    locationAdjusted?: boolean;
  };
  [MAP_ROUTES.PICK_LOCATION]: PickLocationParams;
  [MAP_ROUTES.PUBLIC_PROFILE]: {
    /** profiles.id (preferred) or username */
    profileId: string;
  };
};

export type AddPlaceStackParamList = {
  [MAP_ROUTES.ADD_PLACE]: AddPlaceParams | undefined;
  [MAP_ROUTES.PICK_LOCATION]: PickLocationParams;
};

export type ProfileStackParamList = {
  [PROFILE_ROUTES.PROFILE_HOME]: undefined;
  [PROFILE_ROUTES.SETTINGS]: undefined;
  [PROFILE_ROUTES.SETTINGS_ACCOUNT]: undefined;
  [PROFILE_ROUTES.CHANGE_PASSWORD]: undefined;
  [PROFILE_ROUTES.CHANGE_EMAIL]: undefined;
  [PROFILE_ROUTES.SETTINGS_APPEARANCE]: undefined;
  [PROFILE_ROUTES.SETTINGS_NOTIFICATIONS]: undefined;
  [PROFILE_ROUTES.SETTINGS_PRIVACY_LOCATION]: undefined;
  [PROFILE_ROUTES.SETTINGS_ABOUT]: undefined;
  [PROFILE_ROUTES.ADMIN_PANEL]: undefined;
  [PROFILE_ROUTES.ADMIN_PLACE_DETAIL]: { placeId: string };
  [PROFILE_ROUTES.ADMIN_UPDATE_REQUEST]: { requestId: string };
};

export type MainTabParamList = {
  [TAB_ROUTES.EXPLORE]: NavigatorScreenParams<MapStackParamList> | undefined;
  [TAB_ROUTES.SAVED]: undefined;
  [TAB_ROUTES.ADD_PLACE]: NavigatorScreenParams<AddPlaceStackParamList> | undefined;
  [TAB_ROUTES.PROFILE]: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type RootStackParamList = {
  [ROOT_ROUTES.SPLASH]: undefined;
  [ROOT_ROUTES.ONBOARDING]: undefined;
  [ROOT_ROUTES.AUTH]: undefined;
  [ROOT_ROUTES.LOCATION_PERMISSION]: undefined;
  [ROOT_ROUTES.MAIN]: undefined;
  [ROOT_ROUTES.PLACE_DETAIL]: { placeId: string };
  [ROOT_ROUTES.ADD_PLACE]: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
