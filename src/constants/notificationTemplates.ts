import { i18n } from '../i18n';
import { NOTIFICATION_TYPES, type NotificationType } from './notificationTypes';

export interface NotificationTemplateInput {
  placeTitle?: string;
  actorName?: string;
  customTitle?: string;
  customBody?: string;
}

export interface NotificationTemplate {
  title: string;
  body: string;
}

/**
 * Centralized copy for notification previews (prefs / admin helpers).
 * Inbox list prefers `formatNotificationForDisplay` so historical rows can
 * fall back to stored title/body when metadata is missing.
 *
 * Push payloads written server-side remain English until server localization exists.
 */
export function getNotificationTemplate(
  type: NotificationType,
  input: NotificationTemplateInput = {},
): NotificationTemplate {
  const place = input.placeTitle?.trim();
  const actor = input.actorName?.trim();
  const yourPlace = i18n.t('notifications.fallbacks.yourPlace');
  const someone = i18n.t('notifications.fallbacks.someone');

  switch (type) {
    case NOTIFICATION_TYPES.PLACE_APPROVED:
      return {
        title: i18n.t('notifications.types.placeApproved.title'),
        body: place
          ? i18n.t('notifications.types.placeApproved.body', { place })
          : i18n.t('notifications.types.placeApproved.body', { place: yourPlace }),
      };
    case NOTIFICATION_TYPES.PLACE_REJECTED:
      return {
        title: i18n.t('notifications.types.placeRejected.title'),
        body: place
          ? i18n.t('notifications.types.placeRejected.body', { place })
          : i18n.t('notifications.types.placeRejected.body', { place: yourPlace }),
      };
    case NOTIFICATION_TYPES.PLACE_UPDATED_APPROVED:
      return {
        title: i18n.t('notifications.types.placeUpdateApproved.title'),
        body: place
          ? i18n.t('notifications.types.placeUpdateApproved.body', { place })
          : i18n.t('notifications.types.placeUpdateApproved.body', { place: yourPlace }),
      };
    case NOTIFICATION_TYPES.PLACE_UPDATED_REJECTED:
      return {
        title: i18n.t('notifications.types.placeUpdateRejected.title'),
        body: place
          ? i18n.t('notifications.types.placeUpdateRejected.body', { place })
          : i18n.t('notifications.types.placeUpdateRejected.body', { place: yourPlace }),
      };
    case NOTIFICATION_TYPES.PLACE_LIKED:
      return {
        title: i18n.t('notifications.types.placeLiked.title'),
        body: i18n.t('notifications.types.placeLiked.body', {
          actor: actor || someone,
          place: place || yourPlace,
        }),
      };
    case NOTIFICATION_TYPES.SYSTEM:
      return {
        title: input.customTitle?.trim() || i18n.t('notifications.types.system.title'),
        body: input.customBody?.trim() || i18n.t('notifications.types.system.body'),
      };
    case NOTIFICATION_TYPES.EVENT:
      return {
        title: input.customTitle?.trim() || i18n.t('notifications.types.event.title'),
        body: input.customBody?.trim() || i18n.t('notifications.types.event.body'),
      };
    case NOTIFICATION_TYPES.PROFILE_PHOTO_REMOVED:
      return {
        title: i18n.t('notifications.types.profilePhotoRemoved.title'),
        body: i18n.t('notifications.types.profilePhotoRemoved.body'),
      };
    case NOTIFICATION_TYPES.PROFILE_USERNAME_RESET:
      return {
        title: i18n.t('notifications.types.profileUsernameReset.title'),
        body: i18n.t('notifications.types.profileUsernameReset.body'),
      };
    case NOTIFICATION_TYPES.PROFILE_SUSPENDED:
      return {
        title: i18n.t('notifications.types.profileSuspended.title'),
        body: input.customBody?.trim() || i18n.t('notifications.types.profileSuspended.body'),
      };
    case NOTIFICATION_TYPES.PROFILE_UNSUSPENDED:
      return {
        title: i18n.t('notifications.types.profileUnsuspended.title'),
        body: i18n.t('notifications.types.profileUnsuspended.body'),
      };
    default:
      return {
        title: input.customTitle?.trim() || i18n.t('notifications.types.fallback.title'),
        body: input.customBody?.trim() || i18n.t('notifications.types.fallback.body'),
      };
  }
}
