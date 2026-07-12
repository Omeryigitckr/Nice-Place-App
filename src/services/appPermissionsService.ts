import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { devLog } from '../utils/devLog';

export type PermissionState = 'granted' | 'denied' | 'blocked' | 'undetermined' | 'unavailable';

export interface PermissionSnapshot {
  state: PermissionState;
  canAskAgain: boolean;
}

export interface PermissionEnsureResult extends PermissionSnapshot {
  granted: boolean;
  shouldOpenSettings: boolean;
}

function mapPermissionResponse(
  status: string,
  canAskAgain: boolean | undefined,
): PermissionSnapshot {
  if (status === 'granted') {
    return { state: 'granted', canAskAgain: true };
  }

  if (status === 'undetermined') {
    return { state: 'undetermined', canAskAgain: true };
  }

  if (canAskAgain === false) {
    return { state: 'blocked', canAskAgain: false };
  }

  return { state: 'denied', canAskAgain: canAskAgain ?? true };
}

function toEnsureResult(snapshot: PermissionSnapshot): PermissionEnsureResult {
  return {
    ...snapshot,
    granted: snapshot.state === 'granted',
    shouldOpenSettings: snapshot.state === 'blocked',
  };
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function getNotificationPermissionStatus(): Promise<PermissionSnapshot> {
  const response = await Notifications.getPermissionsAsync();
  return mapPermissionResponse(response.status, response.canAskAgain);
}

export async function requestNotificationPermission(): Promise<PermissionEnsureResult> {
  const current = await getNotificationPermissionStatus();
  if (current.state === 'granted') {
    return toEnsureResult(current);
  }
  if (current.state === 'blocked') {
    return toEnsureResult(current);
  }

  const response = await Notifications.requestPermissionsAsync();
  const next = mapPermissionResponse(response.status, response.canAskAgain);
  devLog('[Nice Place Permissions] notification request result', next.state);
  return toEnsureResult(next);
}

export async function ensureNotificationPermission(
  options?: { request?: boolean },
): Promise<PermissionEnsureResult> {
  const current = await getNotificationPermissionStatus();
  if (current.state === 'granted') {
    return toEnsureResult(current);
  }
  if (current.state === 'blocked') {
    return toEnsureResult(current);
  }
  if (options?.request === false) {
    return toEnsureResult(current);
  }
  return requestNotificationPermission();
}

export async function getLocationPermissionStatus(): Promise<PermissionSnapshot> {
  const response = await Location.getForegroundPermissionsAsync();
  return mapPermissionResponse(response.status, response.canAskAgain);
}

export async function requestLocationPermission(): Promise<PermissionEnsureResult> {
  const current = await getLocationPermissionStatus();
  if (current.state === 'granted') {
    return toEnsureResult(current);
  }
  if (current.state === 'blocked') {
    return toEnsureResult(current);
  }

  const response = await Location.requestForegroundPermissionsAsync();
  const next = mapPermissionResponse(response.status, response.canAskAgain);
  devLog('[Nice Place Permissions] location request result', next.state);
  return toEnsureResult(next);
}

export async function ensureLocationPermission(
  options?: { request?: boolean },
): Promise<PermissionEnsureResult> {
  const current = await getLocationPermissionStatus();
  if (current.state === 'granted') {
    return toEnsureResult(current);
  }
  if (current.state === 'blocked') {
    return toEnsureResult(current);
  }
  if (options?.request === false) {
    return toEnsureResult(current);
  }
  return requestLocationPermission();
}

export async function getMediaPermissionStatus(): Promise<PermissionSnapshot> {
  const response = await ImagePicker.getMediaLibraryPermissionsAsync();
  return mapPermissionResponse(response.status, response.canAskAgain);
}

export async function requestMediaPermission(): Promise<PermissionEnsureResult> {
  const current = await getMediaPermissionStatus();
  if (current.state === 'granted') {
    return toEnsureResult(current);
  }
  if (current.state === 'blocked') {
    return toEnsureResult(current);
  }

  const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const next = mapPermissionResponse(response.status, response.canAskAgain);
  devLog('[Nice Place Permissions] media request result', next.state);
  return toEnsureResult(next);
}

export async function ensureMediaPermission(
  options?: { request?: boolean },
): Promise<PermissionEnsureResult> {
  const current = await getMediaPermissionStatus();
  if (current.state === 'granted') {
    return toEnsureResult(current);
  }
  if (current.state === 'blocked') {
    return toEnsureResult(current);
  }
  if (options?.request === false) {
    return toEnsureResult(current);
  }
  return requestMediaPermission();
}

export function permissionStatusLabel(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return 'settings.permissionStatus.granted';
    case 'denied':
      return 'settings.permissionStatus.denied';
    case 'blocked':
      return 'settings.permissionStatus.blocked';
    case 'undetermined':
      return 'settings.permissionStatus.undetermined';
    default:
      return 'settings.permissionStatus.unavailable';
  }
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Nice Place',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#44A878',
  });
}

export async function runInitialPermissionSequence(): Promise<void> {
  await ensureAndroidNotificationChannel();
  await requestNotificationPermission();
  await requestLocationPermission();
}
