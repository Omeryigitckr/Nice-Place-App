import { i18n } from '../i18n/instance';
import { MAX_PLACE_CATEGORIES, MIN_PLACE_CATEGORIES } from '../constants/placeCategories';
import { MAX_PLACE_PHOTOS, MIN_PLACE_PHOTOS } from '../services/placePhotoService';

/**
 * Localizes place-form validation / service messages.
 * Prefer storing translation keys in state; English leftovers map as a fallback.
 */
export function localizePlaceFormMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  if (
    message.startsWith('placeForm.') ||
    message.startsWith('addPlace.') ||
    message.startsWith('editPlace.') ||
    message.startsWith('errors.') ||
    message.startsWith('auth.') ||
    message.startsWith('place.')
  ) {
    if (message === 'placeForm.validation.categoriesMax') {
      return String(i18n.t(message, { count: MAX_PLACE_CATEGORIES }));
    }
    if (
      message === 'placeForm.validation.categoriesRange' ||
      message === 'placeForm.validation.categoriesSetRange'
    ) {
      return String(
        i18n.t(message, { min: MIN_PLACE_CATEGORIES, max: MAX_PLACE_CATEGORIES }),
      );
    }
    if (message === 'placeForm.validation.photosSetRange') {
      return String(i18n.t(message, { min: MIN_PLACE_PHOTOS, max: MAX_PLACE_PHOTOS }));
    }
    return String(i18n.t(message as never));
  }

  return message;
}

export function placeFormMessageKey(key: string): string {
  return key;
}
