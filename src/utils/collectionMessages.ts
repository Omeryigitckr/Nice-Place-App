import { i18n } from '../i18n/instance';

/** Keep in sync with collectionsService COLLECTION_*_MAX_LENGTH. */
const COLLECTION_NAME_MAX_LENGTH = 40;
const COLLECTION_DESCRIPTION_MAX_LENGTH = 120;

/**
 * Localizes collection / saved-place service messages.
 * Prefer storing translation keys in state; English leftovers map as a fallback.
 */
export function localizeCollectionMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  if (
    message.startsWith('collections.') ||
    message.startsWith('saved.') ||
    message.startsWith('explore.') ||
    message.startsWith('place.') ||
    message.startsWith('errors.') ||
    message.startsWith('auth.') ||
    message.startsWith('common.') ||
    message.startsWith('network.')
  ) {
    if (message === 'collections.errors.nameTooLong') {
      return i18n.t(message, { max: COLLECTION_NAME_MAX_LENGTH });
    }
    if (message === 'collections.errors.descriptionTooLong') {
      return i18n.t(message, { max: COLLECTION_DESCRIPTION_MAX_LENGTH });
    }
    return i18n.t(message as never);
  }

  return message;
}

export function collectionMessageKey(key: string): string {
  return key;
}
