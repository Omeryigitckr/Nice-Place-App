import { i18n } from '../i18n/instance';
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../constants/notificationTypes';
import type { AppNotification, NotificationData } from '../types/notification';

type NotificationTypeKeyMap = {
  titleKey: string;
  bodyKey: string;
  bodyGenericKey?: string;
};

/** Stable type → translation key roots (never use translated strings as IDs). */
export const NOTIFICATION_TYPE_KEYS: Record<NotificationType, NotificationTypeKeyMap> = {
  [NOTIFICATION_TYPES.PLACE_APPROVED]: {
    titleKey: 'notifications.types.placeApproved.title',
    bodyKey: 'notifications.types.placeApproved.body',
    bodyGenericKey: 'notifications.types.placeApproved.bodyGeneric',
  },
  [NOTIFICATION_TYPES.PLACE_REJECTED]: {
    titleKey: 'notifications.types.placeRejected.title',
    bodyKey: 'notifications.types.placeRejected.body',
    bodyGenericKey: 'notifications.types.placeRejected.bodyGeneric',
  },
  [NOTIFICATION_TYPES.PLACE_UPDATED_APPROVED]: {
    titleKey: 'notifications.types.placeUpdateApproved.title',
    bodyKey: 'notifications.types.placeUpdateApproved.body',
    bodyGenericKey: 'notifications.types.placeUpdateApproved.bodyGeneric',
  },
  [NOTIFICATION_TYPES.PLACE_UPDATED_REJECTED]: {
    titleKey: 'notifications.types.placeUpdateRejected.title',
    bodyKey: 'notifications.types.placeUpdateRejected.body',
    bodyGenericKey: 'notifications.types.placeUpdateRejected.bodyGeneric',
  },
  [NOTIFICATION_TYPES.PLACE_LIKED]: {
    titleKey: 'notifications.types.placeLiked.title',
    bodyKey: 'notifications.types.placeLiked.body',
    bodyGenericKey: 'notifications.types.placeLiked.bodyGeneric',
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    titleKey: 'notifications.types.system.title',
    bodyKey: 'notifications.types.system.body',
  },
  [NOTIFICATION_TYPES.EVENT]: {
    titleKey: 'notifications.types.event.title',
    bodyKey: 'notifications.types.event.body',
  },
  [NOTIFICATION_TYPES.PROFILE_PHOTO_REMOVED]: {
    titleKey: 'notifications.types.profilePhotoRemoved.title',
    bodyKey: 'notifications.types.profilePhotoRemoved.body',
  },
  [NOTIFICATION_TYPES.PROFILE_USERNAME_RESET]: {
    titleKey: 'notifications.types.profileUsernameReset.title',
    bodyKey: 'notifications.types.profileUsernameReset.body',
  },
  [NOTIFICATION_TYPES.PROFILE_SUSPENDED]: {
    titleKey: 'notifications.types.profileSuspended.title',
    bodyKey: 'notifications.types.profileSuspended.body',
  },
  [NOTIFICATION_TYPES.PROFILE_UNSUSPENDED]: {
    titleKey: 'notifications.types.profileUnsuspended.title',
    bodyKey: 'notifications.types.profileUnsuspended.body',
  },
};

export interface NotificationDisplayCopy {
  title: string;
  body: string;
}

const ENGLISH_PLACE_BODY: Partial<Record<NotificationType, RegExp>> = {
  [NOTIFICATION_TYPES.PLACE_APPROVED]: /^Your place "(.+)" has been approved\.$/,
  [NOTIFICATION_TYPES.PLACE_REJECTED]: /^Your place "(.+)" was not approved\.$/,
  [NOTIFICATION_TYPES.PLACE_UPDATED_APPROVED]: /^Your update to "(.+)" was approved\.$/,
  [NOTIFICATION_TYPES.PLACE_UPDATED_REJECTED]: /^Your update to "(.+)" was not approved\.$/,
};

const ENGLISH_LIKE_BODY = /^(.+) liked your place "(.+)"\.$/;

const ENGLISH_DEFAULT_SYSTEM_TITLE = 'Announcement';
const ENGLISH_DEFAULT_SYSTEM_BODY = 'You have a new announcement from Nice Place.';
const ENGLISH_DEFAULT_EVENT_TITLE = 'Event';
const ENGLISH_DEFAULT_EVENT_BODY = 'Check out what is happening in Nice Place.';
const ENGLISH_DEFAULT_SUSPENDED_BODY = 'Your account has been suspended.';

const ENGLISH_SUSPENDED_VARIANTS: Record<string, string> = {
  'Your account has been suspended indefinitely.':
    'notifications.types.profileSuspended.bodyIndefinite',
  'Your account has been suspended for 24 hours.':
    'notifications.types.profileSuspended.body24h',
  'Your account has been suspended for 7 days.':
    'notifications.types.profileSuspended.body7d',
  'Your account has been suspended for 30 days.':
    'notifications.types.profileSuspended.body30d',
  [ENGLISH_DEFAULT_SUSPENDED_BODY]: 'notifications.types.profileSuspended.body',
};

function readOptionalString(data: NotificationData | undefined, key: string): string | undefined {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function extractPlaceFromStoredBody(type: NotificationType, body: string): string | undefined {
  const pattern = ENGLISH_PLACE_BODY[type];
  if (!pattern) {
    return undefined;
  }
  const match = body.match(pattern);
  return match?.[1]?.trim() || undefined;
}

function extractLikeVars(body: string): { actor?: string; place?: string } {
  const match = body.match(ENGLISH_LIKE_BODY);
  if (!match) {
    return {};
  }
  return {
    actor: match[1]?.trim() || undefined,
    place: match[2]?.trim() || undefined,
  };
}

/**
 * Resolves inbox title/body for display.
 *
 * Prefer type + metadata templates. Historical rows often only store English
 * title/body; when they match known English templates we re-render localized
 * copy (optionally extracting place/actor). Custom SYSTEM/EVENT and unknown
 * admin/user free text fall back to the stored strings.
 */
export function formatNotificationForDisplay(
  notification: Pick<AppNotification, 'type' | 'title' | 'body' | 'data'>,
): NotificationDisplayCopy {
  const type = notification.type;
  const keys = NOTIFICATION_TYPE_KEYS[type];
  const data = notification.data;
  const storedTitle = notification.title?.trim() || '';
  const storedBody = notification.body?.trim() || '';

  const placeFromData =
    readOptionalString(data, 'placeTitle') ?? readOptionalString(data, 'placeName');
  const actorFromData =
    readOptionalString(data, 'actorName') ?? readOptionalString(data, 'userName');

  const tKey = (key: string, options?: Record<string, string>): string =>
    String(i18n.t(key as never, options as never));

  if (!keys) {
    return {
      title: storedTitle || tKey('notifications.types.fallback.title'),
      body: storedBody || tKey('notifications.types.fallback.body'),
    };
  }

  if (type === NOTIFICATION_TYPES.SYSTEM || type === NOTIFICATION_TYPES.EVENT) {
    const defaultTitle =
      type === NOTIFICATION_TYPES.SYSTEM
        ? ENGLISH_DEFAULT_SYSTEM_TITLE
        : ENGLISH_DEFAULT_EVENT_TITLE;
    const defaultBody =
      type === NOTIFICATION_TYPES.SYSTEM
        ? ENGLISH_DEFAULT_SYSTEM_BODY
        : ENGLISH_DEFAULT_EVENT_BODY;
    const isDefaultTitle = !storedTitle || storedTitle === defaultTitle;
    const isDefaultBody = !storedBody || storedBody === defaultBody;
    return {
      title: isDefaultTitle ? tKey(keys.titleKey) : storedTitle,
      body: isDefaultBody ? tKey(keys.bodyKey) : storedBody,
    };
  }

  if (type === NOTIFICATION_TYPES.PROFILE_SUSPENDED) {
    const variantKey = storedBody ? ENGLISH_SUSPENDED_VARIANTS[storedBody] : undefined;
    return {
      title: tKey(keys.titleKey),
      body: variantKey ? tKey(variantKey) : storedBody || tKey(keys.bodyKey),
    };
  }

  if (
    type === NOTIFICATION_TYPES.PROFILE_PHOTO_REMOVED ||
    type === NOTIFICATION_TYPES.PROFILE_USERNAME_RESET ||
    type === NOTIFICATION_TYPES.PROFILE_UNSUSPENDED
  ) {
    return {
      title: tKey(keys.titleKey),
      body: tKey(keys.bodyKey),
    };
  }

  if (type === NOTIFICATION_TYPES.PLACE_LIKED) {
    const extracted = extractLikeVars(storedBody);
    const place = placeFromData ?? extracted.place;
    const actor = actorFromData ?? extracted.actor;
    if (place && actor) {
      return {
        title: tKey(keys.titleKey),
        body: tKey(keys.bodyKey, { place, actor }),
      };
    }
    return {
      title: tKey(keys.titleKey),
      body: keys.bodyGenericKey
        ? tKey(keys.bodyGenericKey)
        : storedBody || tKey(keys.bodyKey),
    };
  }

  // Place approval / rejection / update types
  const place = placeFromData ?? extractPlaceFromStoredBody(type, storedBody);
  if (place) {
    return {
      title: tKey(keys.titleKey),
      body: tKey(keys.bodyKey, { place }),
    };
  }

  return {
    title: tKey(keys.titleKey),
    body: keys.bodyGenericKey
      ? tKey(keys.bodyGenericKey)
      : storedBody || tKey(keys.bodyKey),
  };
}
