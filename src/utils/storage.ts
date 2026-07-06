import AsyncStorage from '@react-native-async-storage/async-storage';
import { devWarn } from './devLog';

const ONBOARDING_COMPLETE_KEY = '@nice_place/onboarding_complete';
const SAVED_PLACE_IDS_KEY = '@nice_place/saved_place_ids';

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

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch (error: unknown) {
    devWarn('[Nice Place] Failed to save onboarding state:', error);
  }
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
  } catch (error: unknown) {
    devWarn('[Nice Place] Failed to save places:', error);
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
