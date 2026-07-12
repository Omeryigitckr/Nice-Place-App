import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

import { devWarn } from './devLog';

/** Primary onboarding flag — value is native install time (ms) for this completion. */
export const ONBOARDING_COMPLETED_KEY = 'niceplace:onboarding:v1:completed';

/** @deprecated Migrated on read — do not write. */
export const ONBOARDING_LEGACY_KEY = '@nice_place/onboarding_complete';

/** @deprecated Migrated on read — do not write. */
export const ONBOARDING_INSTALL_MARKER_KEY = '@nice_place/onboarding_install_marker';

const SAVED_PLACE_IDS_KEY = '@nice_place/saved_place_ids';

const LEGACY_ONBOARDING_KEYS = [ONBOARDING_LEGACY_KEY, ONBOARDING_INSTALL_MARKER_KEY] as const;

export const ONBOARDING_STORAGE_KEYS = {
  completed: ONBOARDING_COMPLETED_KEY,
  legacy: ONBOARDING_LEGACY_KEY,
  legacyInstallMarker: ONBOARDING_INSTALL_MARKER_KEY,
} as const;

/** Tracks whether the one-time native permission sequence has run after onboarding. */
export const INITIAL_PERMISSIONS_SEQUENCE_KEY = 'niceplace:permissions:initial_sequence:v1';

/** @deprecated Replaced by INITIAL_PERMISSIONS_SEQUENCE_KEY */
export const NOTIFICATION_PERMISSION_PROMPTED_KEY =
  'niceplace:notifications:permission_prompted:v1';

export async function hasInitialPermissionSequenceRun(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INITIAL_PERMISSIONS_SEQUENCE_KEY);
    if (value === '1') {
      return true;
    }

    const legacy = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_PROMPTED_KEY);
    return legacy === '1';
  } catch {
    return false;
  }
}

export async function setInitialPermissionSequenceRun(): Promise<void> {
  await AsyncStorage.setItem(INITIAL_PERMISSIONS_SEQUENCE_KEY, '1');
}

/** @deprecated Use hasInitialPermissionSequenceRun */
export async function hasNotificationPermissionBeenPrompted(): Promise<boolean> {
  return hasInitialPermissionSequenceRun();
}

/** @deprecated Use setInitialPermissionSequenceRun */
export async function setNotificationPermissionPrompted(): Promise<void> {
  await setInitialPermissionSequenceRun();
}

function parseSavedPlaceIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
      return parsed;
    }
  } catch {
    return [];
  }

  return [];
}

async function getNativeInstallTimeMs(): Promise<number | null> {
  try {
    const installTime = await Application.getInstallationTimeAsync();
    const ms =
      installTime instanceof Date
        ? installTime.getTime()
        : typeof installTime === 'number'
          ? installTime
          : NaN;
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  } catch {
    return null;
  }
}

async function clearLegacyOnboardingKeys(): Promise<void> {
  await AsyncStorage.multiRemove([...LEGACY_ONBOARDING_KEYS]);
}

async function persistOnboardingComplete(installTimeMs: number | null): Promise<void> {
  const value = installTimeMs != null ? String(installTimeMs) : 'true';
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, value);
  await clearLegacyOnboardingKeys();
}

function isCompletedForCurrentInstall(
  storedValue: string,
  installTimeMs: number | null,
): boolean {
  if (installTimeMs == null) {
    return storedValue === 'true' || storedValue.length > 0;
  }

  return storedValue === String(installTimeMs);
}

/**
 * One-time migration for users who completed onboarding before v1 storage.
 * Requires legacy install marker to match current install when present so
 * backup-restored stale flags do not skip intro after reinstall.
 */
async function migrateLegacyOnboardingState(
  installTimeMs: number | null,
): Promise<string | null> {
  const legacyMarker = await AsyncStorage.getItem(ONBOARDING_INSTALL_MARKER_KEY);
  if (legacyMarker) {
    if (installTimeMs != null && legacyMarker === String(installTimeMs)) {
      await persistOnboardingComplete(installTimeMs);
      return String(installTimeMs);
    }

    await clearLegacyOnboardingKeys();
    return null;
  }

  const legacyComplete = await AsyncStorage.getItem(ONBOARDING_LEGACY_KEY);
  if (legacyComplete === 'true') {
    // Pre-v1 users on normal app update (same install, local storage intact).
    await persistOnboardingComplete(installTimeMs);
    return installTimeMs != null ? String(installTimeMs) : 'true';
  }

  return null;
}

/**
 * Onboarding completion is scoped to the current native app installation.
 * Fresh install / reinstall / clear-data → intro shows again.
 * Normal app update → same install time → intro stays skipped.
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const installTimeMs = await getNativeInstallTimeMs();
    let stored = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

    if (!stored) {
      stored = await migrateLegacyOnboardingState(installTimeMs);
    }

    if (!stored) {
      return false;
    }

    if (!isCompletedForCurrentInstall(stored, installTimeMs)) {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      await clearLegacyOnboardingKeys();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  try {
    const installTimeMs = await getNativeInstallTimeMs();
    await persistOnboardingComplete(installTimeMs);
  } catch {
    devWarn('[Nice Place] Failed to save onboarding state');
  }
}

/** Development-only helper to re-test first-launch onboarding. */
export async function resetOnboardingForDevelopment(): Promise<void> {
  if (!__DEV__) {
    return;
  }

  await AsyncStorage.multiRemove([ONBOARDING_COMPLETED_KEY, ...LEGACY_ONBOARDING_KEYS]);
}

export async function getSavedPlaceIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PLACE_IDS_KEY);
    return parseSavedPlaceIds(raw);
  } catch {
    return [];
  }
}

export async function setSavedPlaceIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_PLACE_IDS_KEY, JSON.stringify(ids));
  } catch {
    devWarn('[Nice Place] Failed to save places');
  }
}

export async function toggleSavedPlaceId(placeId: string): Promise<string[]> {
  const current = await getSavedPlaceIds();
  const next = current.includes(placeId)
    ? current.filter((id) => id !== placeId)
    : [...current, placeId];

  await setSavedPlaceIds(next);
  return next;
}
